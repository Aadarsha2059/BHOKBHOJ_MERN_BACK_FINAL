const mongoose=require("mongoose")

const CategorySchema= new mongoose.Schema({
    name:{type:String, required:true,unique:true},
    filepath:{type:String}
},{ timestamps: true });

// ✅ PERFORMANCE: Add index for sorting by name (used in getAllCategories)
CategorySchema.index({ name: 1 });

module.exports =mongoose.model('foodCategory',CategorySchema);