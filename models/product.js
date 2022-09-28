const mongoose =require('mongoose');
// const Comment =require('./comment');
const {Schema} = mongoose;

const productSchema= new Schema({
    title:{
        type:String,
        required:true
    },
    author:{
        type:String,
        required:true
    },
    images:[
        {
            url:String,
            filename:String
        }
    ],
    language:{
        type:String,
        required:true
    },
    pages:{
        type:Number,
        required:true
    },
    price:{
        type:Number,
        required:true,
        min:[0,'price cannot be negetive']
    },
    comments:[
        {
        type: Schema.Types.ObjectId,
        ref: 'Comment'  //Comment model or comments collection
        }
    ],
    owner:{
        type: Schema.Types.ObjectId,
        ref: 'User', //User model or users collection
        required:true
    },
    buyer:{
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    status:{
        type:String,
        enum: ['available','sold'],
        default: 'available'
    },
    category:{
        type:String,
        enum:['non-fiction','dystopian','science-fiction','fantasy','romance','thriller','comedy'],
        required:true
    }
});

const Product= mongoose.model('Product',productSchema);
module.exports= Product;