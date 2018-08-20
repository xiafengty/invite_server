let express = require('express');
let router = express.Router();
const {UserModel,ChatModel}=require("../db/db_test");
const md5=require("blueimp-md5");
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
router.post("/register",function (req,res) {
 const {username,password,type}=req.body;
    UserModel.findOne({username}, (err,data)=> {
        if(!err){
            if(data){
                res.send({code:1,msg:"用户已存在"})
            }else{
                new UserModel({username,password:md5(password),type}).save(function (err,data) {
                    if(!err){
                        if(data){
                            res.cookie("userid",data._id,{maxAge: 1000*60*60*24*7});
                            res.json({code:0,data:{_id:data._id,username,type}});
                        }
                    }else{
                        res.send("网络加载出错");
                    }
                })
            }
        }else{
            res.send("网络加载出错");
        }
    });

});
router.post("/login",function (req,res) {
    const {username,password}=req.body;
    UserModel.findOne({username,password:md5(password)},{password:0},function (err,data) {
        if(!err){
            if(data){

                res.cookie("userid",data._id,{maxAge: 1000*60*60*24*7});
                res.send({code:0,data:data});
            }else{
                res.send({code:1,msg:"用户名或密码错误"});
            }
        }else {
            res.send("fail");
        }
    });
});
router.post('/update', function (req, res) {
    const userid = req.cookies.userid;
    if(!userid) {
        return res.send({code: 1, msg: '请先登陆'});
    }
    UserModel.findByIdAndUpdate({_id: userid}, req.body, function (err, user) {// user是数据库中原来的数据
        const {_id, username, type} = user;
        const data = Object.assign(req.body, {_id, username, type});
        res.send({code: 0, data})
    })
});
// 根据cookie获取对应的user
router.get('/user', function (req, res) {
    // 取出cookie中的userid
    const userid = req.cookies.userid;
    if(!userid) {
        return res.send({code: 1, msg: '请先登陆'})
    }

    // 查询对应的user
    UserModel.findOne({_id: userid}, {password:0}, function (err, user) {
        if(user) {
            return res.send({code: 0, data: user})
        } else {// cookie中的userid不正确
            res.clearCookie('userid') ; // 删除不正确cookie数据
            return res.send({code: 1, msg: '请先登陆'})
        }
    })
});
router.get("/userlist",function (req,res) {
    const {type}=req.query;
    UserModel.find({type},{password:0,__v:0},function (err,users) {
        if(!err){
            if(users){
                return res.json({code:0,data:users})
            }
        }else {
            res.send("网络加载出错！")
        }
    });
});
/*
获取当前用户所有相关聊天信息列表
 */
router.get('/msglist', function (req, res) {
    // 获取cookie中的userid
    const userid = req.cookies.userid;
    // 查询得到所有user文档数组
    UserModel.find(function (err, userDocs) {
        // 用对象存储所有user信息: key为user的_id, val为name和header组成的user对象
        const users = {} ;// 对象容器
        userDocs.forEach(doc => {
            users[doc._id] = {username: doc.username, header: doc.header}
        });
        /*
        查询userid相关的所有聊天信息
         参数1: 查询条件
         参数2: 过滤条件
         参数3: 回调函数
        */
        ChatModel.find({'$or': [{from: userid}, {to: userid}]}, function (err, userMsgs) {
            // 返回包含所有用户和当前用户相关的所有聊天消息的数据
            res.send({code: 0, data: {users, userMsgs}})
        })
    })
});

/*
修改指定消息为已读
 */
router.post('/readmsg', function (req, res) {
    // 得到请求中的from和to
    const from = req.body.from;
    const to = req.cookies.userid;
    /*
    更新数据库中的chat数据
    参数1: 查询条件
    参数2: 更新为指定的数据对象
    参数3: 是否1次更新多条, 默认只更新一条
    参数4: 更新完成的回调函数
     */
    ChatModel.update({from, to, read: false}, {read: true}, {multi: true}, function (err, doc) {
        console.log('/readmsg', doc);
        res.send({code: 0, data: doc.nModified}) // 更新的数量
    })
});

module.exports = router;