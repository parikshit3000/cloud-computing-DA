if(process.env.NODE_ENV !== "production"){
    require('dotenv').config();
}
/* dotenv package looks for .env file in root folder , parses the info there adds to process.env */
/*you can access the variables in .env file using process.env.variable during development mode.  .env file is not uploaded on github.*/

const express=require('express');
const path=require('path');
const app=express();
const mongoose = require('mongoose');
const methodOverride=require('method-override');
const {productSchema,commentSchema}=require('./joi_schemas')
const Product = require('./models/product');
const Comment= require('./models/comment');
const ejsMate= require('ejs-mate');
const AppError=require('./utils/AppError');
const wrapAsync=require('./utils/wrapAsync');
const passport=require('passport');
const localStrategy=require('passport-local');
const User=require('./models/user');
const session=require('express-session'); //req.session.anything
const flash=require('connect-flash'); //flash requires session //req.flash('key','value');
// const cookieParser=require('cookie-parser');
const {storage}= require('./cloudinary/index');
const multer  = require('multer');
const Transaction = require('./models/transaction');
const upload = multer({storage});
const helmet=require('helmet');//for security purpose
const dbUrl=process.env.DB_URL;
// const dbUrl=process.env.DB_URL || 'mongodb://localhost:27017/book_store';
const MongoStore = require('connect-mongo');

const categories=['non-fiction','dystopian','science-fiction','fantasy','romance','thriller','comedy'];

mongoose.connect(dbUrl)
.then(()=>{
    console.log('mongodb connected!')
})
.catch((e)=>{
 console.log('mongodb connection error');
})

// app.use(cookieParser("thisismysecret"));
app.engine('ejs', ejsMate);
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

const secret=process.env.SECRET || 'thisshouldbeabettersecret';
const store=MongoStore.create({
    mongoUrl:dbUrl,
    secret,
    touchAfter: 24 * 60 * 60 //lazy session update (24 hours-> in seconds)
})
store.on("error",e=>{
    console.log("session store error",e);
})
const sessionConfig={
    store,//store: we will use mongodb store instead of default memory store
    secret, //this will be a real secret in production
    //to remove deprecation warning.. below two properties
    resave:false,
    saveUninitialized:true,
    cookie:{
        httpOnly: true,// cookies cant be accessed by js .it can only be accessed by http
        //secure:true->cookie can only be configured in https that is secure connection
        //date.now() is in milisecond so it epires in 1 week
        expires: Date.now()+ 1000*60*60*24*7,
        maxAge: 1000*60*60*24*7
    }

}
app.use(session(sessionConfig));
app.use(flash());
app.use(helmet({contentSecurityPolicy: false}));

app.use(passport.initialize()); // for persistent login session
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());  //to store a user in session
passport.deserializeUser(User.deserializeUser()); //to unstore a user in session

/*****middleware to validate data before sending to mongoose ******/
const validateProduct=(req,res,next)=>{
    const {error}= productSchema.validate(req.body);
    if(error){
        const msg=error.details.map(e=>e.message).join(',');
        throw new AppError(msg,400);
    }
    else{
        next();
    }
}
const validateComment=(req,res,next)=>{
    const {error} =commentSchema.validate(req.body);
    if(error){
        const msg=error.details.map(e=>e.message).join(',');
        throw new AppError(msg,400);
    }
    else{
        next();
    }
}
/***************************************************/


/****** middleware to ensure logged and to check ownership *****/
const isLoggedIn=(req,res,next)=>{
    if(!req.isAuthenticated()){
        req.session.returnTo=req.originalUrl;
        req.flash('error','You must be signed in first!');
        res.redirect('/login');
    }
    else{
        next();
    }
}
const isOwner= async(req,res,next)=>{
    const {id} = req.params;
    const book=await Product.findById(id);
    if(!book.owner.equals(req.user._id)){
        req.flash('error','You are not authorized to do this!');
        return res.redirect(`/products/${id}`);
    }
    next();
}
const isCommentOwner=async(req,res,next)=>{
    const{id,commentId}= req.params;
    const comment = await Comment.findById(commentId);
    if(!comment.owner.equals(req.user._id)){
        req.flash('error','You are not authorized to do this!');
        return res.redirect(`/products/${id}`);
    }
    next();
}

const isPossile=async(req,res,next)=>{
    const {id}=req.params;
    const product=await Product.findById(id);
    const buyer=await User.findById(req.user._id);
    if(buyer.wallet<product.price){
        req.flash('error',"You don't have enough money in your e-wallet");
        return res.redirect(`/products/${id}`);
    }
    if(product.status=='sold'){
        req.flash('error',"This product is already sold!");
        return res.redirect(`/products/${id}`);
    }
    next();  
}
/***************************************************/

app.use((req,res,next)=>{
    //res.locals create variables available throughout all ejs templates
    //we will have access to the message in all the template .. we dont have to pass it through individually
    res.locals.success=req.flash('success'); //we can access using 'success'
    res.locals.error=req.flash('error');
    res.locals.currentUser=req.user;
    next();
})

/******** user routes ********/
app.get('/register',(req,res)=>{
    res.render('register');
})
app.get('/login',(req,res)=>{
    res.render('login');
})
app.post('/register',wrapAsync(async(req,res)=>{
    try{
    const {email,username,password} =req.body;
    const user=new User({email,username});
    const registeredUser=await User.register(user,password);
    req.login(registeredUser, err=>{
        if(err) next(err);
        req.flash('success',`Welcome ${username} !`);
        res.redirect('/products');
    });
    }catch(err){
        req.flash('error',err.message);
        res.redirect('/register');
    }
}))
app.post('/login',passport.authenticate('local',{ failureFlash:true , failureRedirect:'/login' }),(req,res)=>{
    req.flash('success',`Welcome back ${req.body.username}`);
    const redirectTo= req.session.returnTo || '/products';
    delete req.session.returnTo;
    res.redirect(redirectTo);
})
app.get('/logout',(req,res)=>{
    req.logout();
    req.flash("success",'Goodbye!');
    res.redirect('/');
})
app.get('/user',isLoggedIn,wrapAsync(async(req,res)=>{
    const bought_books=await Product.find({buyer:req.user._id});
    const created_books=await Product.find({owner:req.user._id});
    const sold_book=created_books.filter(b=>b.status=='sold');
    const n_bought_books=bought_books.length;
    const n_created_books=created_books.length;
    const n_sold_book=sold_book.length;
    const wallet=req.user.wallet;
    res.render('user',{n_bought_books,n_created_books,n_sold_book,wallet});
}));
app.get('/search',(req,res)=>{
    res.render('search',{categories});
})
/**********************************************/

//WALLET ROUTES
app.get('/eWallet',isLoggedIn,wrapAsync(async(req,res)=>{
    const user=await User.findById(req.user._id).populate({
        path:'transaction',
        populate:[
            {
                path:'seller'
            },
            {
                path:'buyer'
            }
        ]
    });
    res.render('eWallet',{user});
}))
app.post('/addMoney',isLoggedIn,wrapAsync(async (req,res)=>{
    let {money}=req.body;
    money=Number(money);
    if(money<0||money>10000){
        req.flash("error","Please add money in the reasonable range.");
        res.redirect('/eWallet');
    }else{
    const user=await User.findById(req.user._id);
    const config={
        price:money,
        time:new Date(),
        self:true
    };
    const newTransaction=await new Transaction(config);
    await newTransaction.save();
    user.wallet+=money;
    user.transaction.unshift(newTransaction._id);
    await user.save();
    res.redirect('/eWallet');
    }
}))
app.post('/products/:id/transaction',isPossile,wrapAsync(async(req,res)=>{
    const {id}=req.params;
    const product=await Product.findById(id);
    const seller=await User.findById(product.owner);
    const buyer=await User.findById(req.user._id);
    //make new transaction
    //add transaction to buyer and seller users
    //if not enough money or incorrect product id middleware function and check if product status available
    //product status sold
    const config={
        product:product._id,
        buyer:buyer._id,
        seller:seller._id,
        price:product.price,
        time:new Date(),
    }
    const newTransaction=new Transaction(config);
    await newTransaction.save();
    buyer.wallet-=product.price;
    seller.wallet+=product.price;
    buyer.transaction.unshift(newTransaction._id);
    seller.transaction.unshift(newTransaction._id);
    product.status='sold';
    product.buyer=buyer._id;
    await buyer.save();
    await seller.save();
    await product.save();
    req.flash('success','Successfully bought a product')
    res.redirect(`/products/${id}`);
}))
/**********************************************/
app.get('/',(req,res)=>{
    if(req.user!=undefined) res.redirect('/products');
    else res.render('home');
});
app.get('/products/bought',isLoggedIn,wrapAsync(async(req,res)=>{
    const books=await Product.find({buyer:req.user._id});
    res.render('products/bought',{books});
}))
app.get('/products/created',isLoggedIn,wrapAsync(async(req,res)=>{
    const books=await Product.find({owner:req.user._id});
    res.render('products/created',{books});
}))

app.get('/products',wrapAsync(async (req,res)=>{
    const books= await Product.find({});
    res.render('products/index',{books});
    
}));
app.get('/products/search',wrapAsync(async(req,res)=>{
    let search={};
    if(req.query.title!=''){
        search.title={
            $regex: req.query.title,
            $options: 'i'
        }
    }
    if(req.query.author!=''){
        search.author={
            $regex: req.query.author,
            $options: 'i'
        }
    }
    if(req.query.category!='') search.category=req.query.category;
    if(req.query.status!='') search.status=req.query.status;
    const books= await Product.find(search);
    res.render('products/search',{books});
}));
app.get('/products/new',isLoggedIn,(req,res)=>{
    // console.log(req.signedCookies);
    // console.log(req.cookies);
    res.render('products/new',{categories});
});
app.get('/products/:id',wrapAsync(async(req,res,next)=>{
        const {id} =req.params;
        const book= await Product.findById(id).populate({
            path:'comments',
            populate:{
                path:'owner'
            }
        }).populate('owner');  //if product not found mongoose will not throw an error. ejs will be rendered and it may give error there.  book will become null so you need to throw error expicitly
        if(book) res.render('products/show',{book}); //msg: req.flash('success') no need to pass this
        else throw new AppError('product not found',404);
}));
app.get('/products/:id/edit',isLoggedIn,isOwner,async (req,res,next)=>{
    try{
        const {id} =req.params;
        const book= await Product.findById(id);
        if(book) res.render('products/edit',{book,categories});
        else throw new AppError('product not found',404);
    } catch(e){
        next(e);
    }
});
app.post('/products',isLoggedIn,upload.array('image'),validateProduct,wrapAsync(async(req,res,next)=>{
        const book= new Product({...req.body.product});
        book.images=req.files.map(file=>{
            return {
                url:file.path,
                filename:file.filename
            }
        });
        book.owner=req.user._id;
        await book.save();
        req.flash('success','Successfully made a new product')
        res.redirect(`/products/${book._id}`);
}));
// app.post('/products',upload.array('image'),(req,res)=>{
//     console.log(req.body,req.files);
//     res.send('it works');
//     //multer is responsible for adding text input in req.body and files in req.files and uploading the images in cloudinary storage 
// })
app.put('/products/:id',isLoggedIn,isOwner,upload.array('image'),validateProduct,wrapAsync(async(req,res,next)=>{
        const {id} =req.params;
        // const book= await Product.findById(id);
        const book=await Product.findByIdAndUpdate(id,req.body.product,{runValidators:true});
        const imgs=req.files.map(file=>{
            return {
                url:file.path,
                filename:file.filename
            }
        });
        book.images.push(...imgs);
        // await Product.findByIdAndUpdate(id,req.body.product,{runValidators:true});
        req.flash('success','Successfully updated product');
        await book.save();
        res.redirect(`/products/${id}`);
}));
app.delete('/products/:id',isLoggedIn,isOwner,wrapAsync(async(req,res,next)=>{
        const {id}= req.params;
        const book = await Product.findById(id);
        if(book){
            book.comments.forEach(async (comment)=>{
                await Comment.findByIdAndDelete(comment);
            });
            await book.remove();
            req.flash('success','Successfully deleted product');
            res.redirect('/products');
        }
        else{
            throw new AppError('product not found',404);
        }
}));
app.post('/products/:id/comments',isLoggedIn,validateComment,wrapAsync(async(req,res)=>{
    const {id}= req.params;
    const book = await Product.findById(id);
    const comment = new Comment(req.body);
    comment.owner=req.user._id;
    book.comments.push(comment);
    await book.save();
    await comment.save();
    res.redirect(`/products/${id}`);
}));
app.delete('/products/:id/comments/:commentId',isLoggedIn,isCommentOwner,wrapAsync(async(req,res)=>{
    const {id,commentId} =req.params;
    const book=await Product.findById(id);
    const comment =await Comment.findByIdAndDelete(commentId);
    book.comments=book.comments.filter((comment)=>{
        return comment!=commentId;
    });
    await book.save();
    res.redirect(`/products/${id}`);
}));

app.all('*',(req,res,next)=>{// this route will hit if any other did not match
    next(new AppError('page not found',404));
})
app.use(function (err,req,res,next){
    /*if we are throwing a custom error(AppError) it will have .status but for syntax or reference error normal js
    error is thrown which doesnt have status property so we should give it some default value.*/
    const {status=500}=err;
    if(!err.message) err.message="Oh no,something went wrong !";
    if(!err.status) err.status=500;
    res.status(status).render('error',{err});
});

const port= process.env.PORT || 3000;
app.listen(port,()=>{
    console.log(`Listening on port ${port}!`);
})

//next() doesnt necessarily stop the execution of that middleware .it is going to call the next middleware but
// it also exexutes the code below where next is called


/*
client-side validation(html form) - checks if field is not empty. and gives feedback thereitself
server-side validation (joi schema)- validates req.body before even sending data to mongoose
server-side validation (monoose)- mongoose schema k andar jo validations likhte h
*/