"use strict";

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const blogPostSchema = mongoose.Schema({
    title : {type: String, required: true},
    content : {type: String},
    author : { 
        firstName : String,
        lastName : String
    },
    created: {type: Date, default: Date.now}
});

blogPostSchema.virtual("fullName").get(function(){
    return `${this.author.firstName} ${this.author.lastName}`.trim();
});

blogPostSchema.methods.serialize = function(){
    return{
        id: this._id,
        title: this.title,
        content: this.content,
        author: this.fullName,
        created: this.created
    };
};

const BlogPost = mongoose.model("BlogPost", blogPostSchema);

module.exports = { BlogPost };