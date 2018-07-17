'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogData(){
    console.info('seeding blog data');
    const seedData = [];

    for(let i = 1; i <= 10; i++){
        seedData.push(generateBlogData());
    }
    return BlogPost.insertMany(seedData);
}

function generateBlogData(){
    return {
        title: faker.lorem.sentence(),
        content: faker.lorem.sentences(),
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        }
    };
}

function tearDownDb(){
    console.warn("Deleting database");
    return mongoose.connection.dropDatabase();
}

describe("Blogs API resource", function(){

    before(function(){
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function(){
        return seedBlogData();
    });

    afterEach(function(){
        return tearDownDb();
    });

    after(function(){
        return closeServer();
    });

    describe("GET endpoint", function(){

        it("should return all existing blogs", function(){

            let res;
            return chai.request(app)
                .get('/posts')
                .then(function(_res){
                    res = _res;
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.lengthOf.at.least(1);
                    return BlogPost.count();
                })
                .then(function(count){
                    expect(res.body).to.have.lengthOf(count);
                });
        });
    

        it('should return blogs with right fields', function(){
            let resBlog;
            return chai.request(app)
                .get('/posts')
                .then(function(res){
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body).to.be.a('array');
                    expect(res.body).to.have.lengthOf.at.least(1);

                    res.body.forEach(function(blog){
                        expect(blog).to.be.a('object');
                        expect(blog).to.include.keys(
                            'author', 'title', 'content', 'created', 'id'
                        );
                    });
                    resBlog = res.body[0];
                    return BlogPost.findById(resBlog.id);
                })
                .then(function(blog){
                    const fullName = blog.author.firstName + " " + blog.author.lastName;
                    expect(resBlog.author).to.equal(fullName);
                    expect(resBlog.title).to.equal(blog.title);
                    expect(resBlog.content).to.equal(blog.content);
                });
        });
    });

    describe('PUT endpoint', function(){
        
        it('should update fields you send over', function(){
            const updateData = {
                title: "Meow",
                content: "meow meow",
                author:{
                    firstName : "A",
                    lastName : "Cat"
                }
            };

            return BlogPost.findOne()
            .then(function(blog){
                updateData.id = blog.id;

                return chai.request(app)
                        .put(`/posts/${blog.id}`)
                        .send(updateData);
            })
            .then(function(res){
                expect(res).to.have.status(204);

                return BlogPost.findById(updateData.id);
            })
            .then(function(blog){
                expect(blog.title).to.equal(updateData.title);
                expect(blog.content).to.equal(updateData.content);
                expect(blog.author.firstName).to.equal(updateData.author.firstName);
                expect(blog.author.lastName).to.equal(updateData.author.lastName);
            });
        });
    });

    describe('DELETE endpoint', function(){
        
        it('delete a blog by id', function(){

            let blog;

            return BlogPost.findOne()
                .then(function(_blog){
                    blog = _blog;
                    return chai.request(app).delete(`/posts/${blog.id}`);
                })
                .then(function(res){
                    expect(res).to.have.status(204);
                    return BlogPost.findById(blog.id)
                })
                .then(function(_blog){
                    expect(_blog).to.be.null;
                });
        });
    });
});