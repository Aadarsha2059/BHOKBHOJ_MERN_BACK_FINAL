const mongoose=require("mongoose")

const CategorySchema= new mongoose.Schema({
    name:{type:String, required:true,unique:true}, // unique:true automatically creates an index
    filepath:{type:String}
},{ timestamps: true });

// ✅ FIXED: Removed duplicate index - unique:true already creates an index on name field
// CategorySchema.index({ name: 1 }); // REMOVED: Duplicate of unique:true index

module.exports =mongoose.model('foodCategory',CategorySchema);