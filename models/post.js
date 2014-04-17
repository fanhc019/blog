var mongodb = require('./db');
var markdown = require('markdown').markdown;

function Post(name, title, tags, post) {
	this.name = name;
	this.title = title;
	this.tags = tags;
	this.post = post;
}

module.exports = Post;

//存储一篇文章及其相关信息
Post.prototype.save = function(callback) {
	var date = new Date();
	//存储各种时间格式，方便以后扩展
	var time = {
		date: date,
		year: date.getFullYear(),
		month: date.getFullYear() + "-" + (date.getMonth() + 1),
		day: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
		minute: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
	}
	//要存入数据库的文档
	var post = {
		name: this.name,
		time: time,
		title: this.title,
		tags: this.tags,
		post: this.post,
		comments: [],
		pv: 0
	};
	//打开数据库
	mongodb.open(function(err, db) {
		if (err) {
			return callback(err);
		}
		//读取 posts 集合
		db.collection('posts',
		function(err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			//将文档插入 posts 集合
			collection.insert(post, {
				safe: true
			},
			function(err) {
				mongodb.close();
				if (err) {
					return callback(err); //失败！返回 err
				}
				callback(null); //返回 err 为 null
			});
		});
	});
};

//读取文章及其相关信息
Post.getTen = function(name, page, callback){
	//打开数据库
	mongodb.open(function(err, db){
		if(err){
			return callback(err);
		}
		//读取posts集合
		db.collection('posts', function(err, collection){
			if(err) {
				db.close();
				return callback(err);
			}
			var query = {};
			if(name){
				query.name = name;
			}
			//使用count 返回特定查询的文档数total
			collection.count(query, function(err, total) {
				//根据query对象查询，并跳过(page - 1)*10个结果，返回之后的十个结果
				collection.find(query, {
					skip: (page - 1)*10,
					limit: 10
				}).sort({
					time: -1
				}).toArray(function(err, docs){
					mongodb.close();
					if(err) {
						return callback(err);
					}
					//解析markdown 为html
					docs.forEach(function(doc){
						doc.post = markdown.toHTML(doc.post);
					});
					callback(null, docs, total);
				});
			});
		});
	});
};

//获取一篇文章
Post.getOne = function(name, day, title, callback) {
  //打开数据库
  mongodb.open(function (err, db) {
    if (err) {
      return callback(err);
    }
    //读取 posts 集合
    db.collection('posts', function (err, collection) {
      if (err) {
        mongodb.close();
        return callback(err);
      }
      //根据用户名、发表日期及文章名进行查询
      collection.findOne({
        "name": name,
        "time.day": day,
        "title": title
      }, function (err, doc) {
        if (err) {
          mongodb.close();
          return callback(err);
        }
        if (doc) {
          //每访问 1 次，pv 值增加 1
          collection.update({
            "name": name,
            "time.day": day,
            "title": title
          }, {
            $inc: {"pv": 1}
          }, function (err) {
            mongodb.close();
            if (err) {
              return callback(err);
            }
          });
          //解析 markdown 为 html
          doc.post = markdown.toHTML(doc.post);
          doc.comments.forEach(function (comment) {
            comment.content = markdown.toHTML(comment.content);
          });
          callback(null, doc);//返回查询的一篇文章
        }
      });
    });
  });
};
//返回原始发布的内容(markdown 格式)
Post.edit = function(name, day, title, callback){
	//打开数据库
	mongodb.open(function(err, db){
		if(err){
			return callback(err);
		}
		db.collection('posts', function(err, collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			//根据用户名、发表日期及文章名进行查询
			collection.findOne({
				"name": name,
				"time.day": day,
				"title": title
			}, function(drr, doc){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null, doc);	//返回查询的一篇文章（markdown 格式）
			});
		});
	});
};
Post.update = function(name, day, title, post, callback){
	//打开数据库
	mongodb.open(function(err, db){
		if(err){
			return callback(err);
		}
		//读取posts集合
		db.collection('posts', function(err, collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			collection.update({
				"name": name,
				"time.day": day,
				"title": title
			}, {
				$set: {post: post}
			}, function(err){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null);
			});
		});
	});
};
//删除一篇文章
Post.remove = function(name, day, title, callback){
	//打开数据库
	mongodb.open(function(err, db){
		if(err){
			return callback(err);
		}
		//读取posts集合
		db.collection('posts', function(err, collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			//根据用户名、日期和标题查找并删除一篇文章
			collection.remove({
				"name": name,
				"time.day": day,
				"title": title
			}, {
				w: 1
			}, function(err){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null);
			});
		});
	});
};
//返回所有文章存档信息
Post.getArchive = function(callback) {
	//打开数据库
	mongodb.open(function(err, db) {
		if(err){
			return callback(err);
		}
		//读取posts集合
		db.collection('posts', function(err, collection) {
			if(err) {
				mongodb.close();
				return callback(err);
			}
			//返回包含name 、 title 、 time 属性的文档组成的文档数组
			collection.find({}, {
				'name': 1,
				'time': 1,
				'title': 1
			}).sort({
				time: -1
			}).toArray(function(err, docs){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null, docs);
			});
		});
	});
};

//返回所有标签
Post.getTags = function(callback) {
	//打开数据库
	mongodb.open(function(err, db) {
		if(err){
			return callback(err);
		}
		db.collection('posts', function(err, collection) {
			if(err){
				mongodb.close();
				return callback(err);
			}
			//distinct 用来找出给定键的所有不通知
			collection.distinct('tags', function(err, docs) {
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null, docs);
			});
		});
	});
};
Post.getTag = function(tag, callback) {
	mongodb.open( function(err, db) {
		if(err) {
			callback(err);
		}
		//获取posts集合
		db.collection('posts' ,function(err, collection) {
			if(err){
				mongodb.close();
				return callback(err);
			}
			//查询所有tags数组内包含tag的文档
			//并返回只有name、time、title组成的文档
			collection.find({
				tags: tag
			}, {
				"name": 1,
				"time": 1,
				"title": 1
			}).sort({
				time: -1
			}).toArray(function(err, docs){
				mongodb.close();
				if(err) {
					return callback(err);
				}
				callback(null, docs);
			});
		});
	});
};
//返回通过标题关键字查询的所有文章信息
Post.search = function(keyword, callback){
	//打开数据库
	mongodb.open(function(err,db) {
		if(err) {
			callback(err);
		}
		db.collection('posts', function(err, collection) {
			if(err) {
				mongodb.close();
				return callback(err);
			}
			var pattern = new RegExp('^.*' + keyword + '.*$', 'i');
			collection.find({
				'title': pattern
			}, {
				'name': 1,
				'time': 1,
				'title': 1
			}).sort({
				'time': -1
			}).toArray(function(err, docs) {
				mongodb.close();
				if(err) {
					return callback(err);
				}
				callback(null, docs);
			});
		});
	});
};




