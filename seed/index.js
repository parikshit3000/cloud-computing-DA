const mongoose = require('mongoose');
const data=require('./data.json');
const Product=require('../models/product.js');
const User = require('../models/user');
mongoose.connect('mongodb://localhost:27017/book_store')
.then(()=>{
    console.log('mongodb connected!');
})
.catch((e)=>{
 console.log('mongodb connection error');
})


const seedDb= async()=>{
    await Product.deleteMany({});
    for(let i=0;i<20;i++){
        let random=Math.floor(Math.random()*90)+1;
        let price=Math.floor(100+Math.random()*300);
        let book= new Product({
            title:data[random].title,
            author:data[random].author,
            language:data[random].language,
            pages:data[random].pages,
            price:price,
            images:[    
              {
                url: 'https://res.cloudinary.com/parikshit/image/upload/v1664285154/book_store/uwvvisypuvsazw2ut319_oeepkw.jpg',
                filename: 'book_store/uwvvisypuvsazw2ut319'
              },
              {
                url: 'https://res.cloudinary.com/parikshit/image/upload/v1664285153/book_store/pcqa20ofswiqbznmrxwb_tgrygl.jpg',
                filename: 'book_store/pcqa20ofswiqbznmrxwb'
              }],
            owner:"61594ef3df60e7c9469bd575",
            category:"comedy"
        });
        await book.save();
    }
}

const updateUser=async()=>{
  const user1=await User.findById('61594ef3df60e7c9469bd575');
  const user2=await User.findById("615b46f5a2739406d1db107e");
  user1.transaction=[];
  user1.wallet=0;
  user2.transaction=[];
  user2.wallet=0;
  await user1.save();
  await user2.save();
}
seedDb()
.then(()=>{
    console.log('data seeded successfully');
    mongoose.connection.close();
})
updateUser()
.then(()=>{
  console.log('user updated successfully');
})
