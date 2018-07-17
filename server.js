"use strict";

const express = require("express");
const morgan = require('morgan');
const mongoose = require("mongoose");

mongoose.Promise = global.Promise;

const { DATABASE_URL, PORT } = require("./config");

const { BlogPost } = require("./models");

const app = express();
app.use(morgan('common'));
app.use(express.json());

app.get("/posts", (req, res) =>{
    BlogPost.find()
        .then(blogPosts => {
            res.json(
                blogPosts.map(blogPost => blogPost.serialize())
            );
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ message: "Internal server error" });
        });
});

app.get("/posts/:id", (req, res) => {
    BlogPost.findById(req.params.id)
    .then(blogPost => res.json(blogPost.serialize()))
    .catch(err => {
        console.error(err);
        res.status(500).json( { message: "Internal server error"});
    });
});

app.post("/posts", (req, res) => {
    const requiredFields = ["title", "content", "author"];
    for (let i = 0; i < requiredFields.length; i++){
        const field = requiredFields[i];
        if (!(field in req.body)){
            const message = `Missing \`${field}\` in request body`;
            console.error(message);
            return res.status(400).send(message);
        }
    }
    BlogPost.create({
        title: req.body.title,
        content: req.body.content,
        author: req.body.author
    })
    .then(blogPost => res.status(201).json(blogPost.serialize()))
    .catch(err => {
        console.error(err);
        res.status(500).json({ message: "Internal server error"});
    });
});

app.put("/posts/:id", (req, res) => {
    if (!(req.params.id && req.body.id && req.params.id === req.body.id)){
        const message = `Request path id (${req.params.id}) and request body id` +
                    `(${req.body.id}) must match`;
        console.error(message);
        return res.status(400).json({ message : message});
    }

    const toUpdate = {};
    const updateableFields = ["author", "content", "title"];

    updateableFields.forEach(field => {
        if (field in req.body) {
            toUpdate[field] = req.body[field];
        }
    });

    BlogPost.findByIdAndUpdate(req.params.id, { $set: toUpdate})
            .then(blogPost => res.status(204).end())
            .catch(err => res.status(500).json({ message: "Internal server error"}));

});

app.delete("/posts/:id", (req, res) => {
    BlogPost.findByIdAndRemove(req.params.id)
        .then(blogPost => res.status(204).json({message: 'success' }))
        .catch(err => res.status(500).json({ message: "Internal server error"}));
});

app.use("*", function(req, res){
    res.status(404).json({ message: "Not Found" });
});

let server;

function runServer(databaseUrl, port = PORT) {
    return new Promise((resolve, reject) => {
        mongoose.connect(
            databaseUrl,
            err => {
                if (err) {
                    return reject(err);
                }
                server = app
                    .listen(port, () => {
                        console.log(`Your app is listening on port ${port}`);
                        resolve();
                    })
                    .on("error", err => {
                        mongoose.disconnect();
                        reject(err);
                    });
            }
        );
    });
}

function closeServer(){
    return mongoose.disconnect().then(() =>{
        return new Promise((resolve, reject) => {
            console.log("Closing server");
            server.close(err => {
                if (err){
                    return reject(err);
                }
                resolve();
            });
        });
    });
}

if (require.main === module){
    runServer(DATABASE_URL).catch(err => console.error(err));
}

module.exports = { app, runServer, closeServer };