const mongoose =require('mongoose');
const {Schema} = mongoose;

const transactionSchema= new Schema({
    product:{
        type:Schema.Types.ObjectId,
        ref:'Product'
    },
    buyer:{
        type:Schema.Types.ObjectId,
        ref:'User'
    },
    seller:{
        type:Schema.Types.ObjectId,
        ref:'User'
    },
    price:{
        type:Number
    },
    time:{
        type: Date
    },
    self:{
        type:Boolean,
        default:false
    }
});

const Transaction= mongoose.model('Transaction',transactionSchema);
module.exports= Transaction;