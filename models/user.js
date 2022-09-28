const mongoose=require('mongoose');
const {Schema} = mongoose;
const passportLocalMongoose=require('passport-local-mongoose');

const userSchema= new Schema({
    // username:{
    //     tyoe:String,
    //     required:true
    // },
    email:{
        type:String,
        required:true,
        unique:true
    },
    // password:{
    //     type:String,
    //     required:true
    // }
    transaction:[{
        type:Schema.Types.ObjectId,
        ref:'Transaction'
    }],
    wallet:{
        type:Number,
        default:0
    }
});

userSchema.plugin(passportLocalMongoose);//it adds a password and username field and makes sure that username is unique

module.exports=mongoose.model('User',userSchema);