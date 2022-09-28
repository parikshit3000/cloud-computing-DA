const joi=require('joi');

module.exports.productSchema=joi.object({
    product:joi.object({
        title:joi.string().required(),
        author:joi.string().required(),
        language:joi.string().required(),
        pages:joi.number().required().min(0),
        price:joi.number().required().min(0),
        category:joi.string().required()
    }).required()
})

module.exports.commentSchema=joi.object({
    text:joi.string().required()
})