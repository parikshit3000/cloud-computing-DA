class AppError extends Error{
    constructor(message,status){
        super();
        this.message=message;
        this.status=status;
    }
}

module.exports=AppError;
//in native Error object there is message propert,stack property but no status property. 
//in default express error handler- express searches for .status or .statusCode on the error object but if not found by default gives 500- for putting on res.status()
//every mongoose error has a property .name