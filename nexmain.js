var express =  require('express');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
var bkfd2Password = require("pbkdf2-password");
var path = require('path');
var fs = require('fs')
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var hasher = bkfd2Password();
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('images'));

app.use(session({
  secret: '1234DSFs@adf1234!@#$asd',
  resave: false,
  saveUninitialized: true,
  store:new MySQLStore({
    host:'localhost',
    port:3306,
    user:'root',
    //password:'Dhtp12rbs.',
    database: 'nex'
  })
}));


var mysql = require('mysql');
var conn = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  //password : 'Dhtp12rbs.',
  database : 'nex'
});

conn.connect();


app.use(passport.initialize());//express연결
app.use(passport.session());//로그인 세션 유지

app.locals.pretty = true;
//뷰 저장경로 지정
app.set('views', './views');
//엔진 템플렛 설정
app.set('view engine', 'jade');

//if not authenticated redirect to login
function authenticationMiddleware () {
  return function (req, res, next) {
    if (req.isAuthenticated()) {
      return next()
    }else{
      res.redirect('/login')

    }
  }
}

//로그인 표시를 위한 전역변수 생성 미들웨어
app.use(function(req, res, next){
  if(req.session.passport){//로그인 이면
    var user = req.session.passport.user
    var sql = 'select * from account where name = ?'
    conn.query(sql, [user], function(err, session){
      if(err){
        console.log(err);
        res.status(500).send('Internal Server Error');
      }else{
        res.locals.SESSIONUSER = session[0];
        next();
      }
    })

  }else{
    next();
  }
})

//passport 미들웨어
passport.use(new LocalStrategy(
  function(username, password, done){
    console.log('username: '+username +' = ' +password)
    var id = username;
    var pwd = password;
    var sql = 'SELECT * FROM account WHERE name=?';
    conn.query(sql, [id], function(err, results){
      if(err){
        return done("잘못됨");
      }else{
        if(!results.length){
          done(null,false)
        }else{
          var user = results[0];
          if(pwd === user.password){
            console.log('LocalStrategy', user);
            done(null, user);
          } else {
            done(null, false);
          }
        }
      }
    });
  }
));

passport.serializeUser(function(user, done) {
  console.log('serializeUser', user);
  //id
  done(null, user.name);//deserializeUser invokes
});
passport.deserializeUser(function(id, done) {
  console.log('deserializeUser', id);
  var sql = 'SELECT * FROM account WHERE name=?';
  conn.query(sql, [id], function(err, results){
    if(err){
      console.log(err);
      done('There is no user.');
    } else {
      //console.log('deserializeUser');
      //console.log(results[0])
      done(null, results[0]);
    }
  });
});

//로그인 확인과정(첫번째로 실행 로그인버튼 누르면 )
app.post(

  '/login',
  passport.authenticate(
    'local',
    {
      successRedirect: '/success',//디비 체크
      failureRedirect: '/fail',//로그인 실패시
      failureFlash: false
    }
  )
);

//로그인 화면
app.get('/login', function(req, res){
  res.render('login');
});

// 로그아웃
app.get('/logout', function(req,res){
  req.logout();
  res.redirect('/login')
  console.log('logout')
  console.log(req.session)
})


//로그인성공했을시 첫 화면
app.get('/success', function(req, res) {
  console.log('login');
  console.log(req.session)
  var sql = 'select * from account where name=?';
  conn.query(sql, [req.session.passport.user], function(err, result){
    if(err){
      console.log(err);
      res.status(500).send("Internal Server Error")
    }else{
      //console.log(result)
      var result = result[0]
      //나중에 master페이지 새로 만들기
      if(result.role =='master'){
        //res.end('/nexmain')
        res.render('header',{id:result.name})
      }
      else if(result.role =='user'){
        res.end('/nexmain')
      }
    }
  })
});

app.get('/fail',function(req, res){
  res.end('fail')
})

//main

app.get('/manageUsers', function(req, res){
  var sql = 'select * from account';

  conn.query(sql,function(err, rows){
    if(err){
      if(err){
        console.log(err);
        res.status(500).send('Internal server error in manageUsers')
      }
    }else{
      res.render('manageUsers', {results: rows})
    }
  })
});

app.post('/deleteUsers', function(req, res){
  var id = req.body.Id

  var remove = 'delete from account where id=?'
  conn.query(remove, [id], function(err, rows){
    if(err){
      console.log(err);
      res.status(500).send('delete account error!');
    }else{

    }
  })
})

app.get('/addUsers', function(req, res){
  res.render('registration')
});

app.post('/registration', function(req, res){
  var name = req.body.username
  var pw = req.body.password

  var adding = 'insert into account (name, password, role) value (?,?,?)'

  conn.query(adding, [name, pw, 'user'], function(err, rows){
    if(err){
      console.log(err);
      res.status(500).send('adding user error!');
    }else{
      res.redirect('/manageUsers')
    }
  })
})

//nexmain
app.get('/nexmain',function(req, res){
  var selectdetail_info = 'select * from input_detail';
  conn.query(selectdetail_info,function(err, rows){
    if(err){
      console.log(err);
      res.status(500).send('select from input_detail error!');
    }else{

      res.render('nexmain',{results:rows});
    }
  });

});

app.get('/getFiles', function(req, res){
  console.log('it comes')
  /*fs.readdir('/Users/sekyunoh/Documents/nex/견적서/', function(err, files) {
    if (err) return;
    console.log('Files: ' + files);*/
    res.render('sidebar', {Files: files})
  })
})

//수주대장작성
app.get('/registerdetail', function(req, res){
  res.render('registerdetail')
});

app.post('/openExcel', function(req, res){
  console.log(req.body.path);

  fs.open(req.body.path, 'r', function(err, data){
    if(err){
      console.log(err)
    }
  });
})

app.post('/registerdetail/complete', function(req, res){
  var acceptdate = req.body.acceptdate;
  var reservationway = req.body.reservationway.trim();
  var demandcompany = req.body.demandcompany.trim();
  var insalesman = req.body.insalesman.trim();
  var outsalesman = req.body.outsalesman.trim();
  var nameofcontract = req.body.nameofcontract.trim();
  var sum = req.body.sum.trim();
  var expectdate = req.body.expectdate;
  var deliver = req.body.deliver.trim();
  var setup = req.body.setup.trim();
  var reference = req.body.reference.trim();
  var box1 = req.body.box1;
  var document3_list1 = req.body.document3_list1.trim()
  var document3_list2 = req.body.document3_list2.trim()
  var document3_list3 = req.body.document3_list3.trim()
  var document3_list4 = req.body.document3_list4.trim()
  var document3_list5 = req.body.document3_list5.trim()
  var document3_list6 = req.body.document3_list6.trim()
  var document3_list7 = req.body.document3_list7.trim()
  var document3_list1_name = req.body.document3_list1_name.trim();
  var document3_list2_name = req.body.document3_list2_name.trim();
  var document3_list3_name = req.body.document3_list3_name.trim();
  var document3_list4_name = req.body.document3_list4_name.trim();
  var document3_list5_name = req.body.document3_list5_name.trim();
  var document3_list6_name = req.body.document3_list6_name.trim();
  var document3_list7_name = req.body.document3_list7_name.trim();
  //var doc3filePath = '/Users/sekyunoh/Documents/nex/발주서/';
  var doc3filePath = '\root\OFFICE_HSNEX\0.HSNEX-공유\Pro.주문서(발주서) 모음'


  var document1 = req.body.document1.trim();
  //var doc1filePath = '/Users/sekyunoh/Documents/nex/견적서/'+document1;
  var doc1filePath = '\root\OFFICE_HSNEX\0.HSNEX-공유\Pro.NEX-견적서 모음'+document1
  fs.writeFile(doc1filePath,function(error){
    if(error){
      console.log(error);
    }else{
      console.log('uploading success')
    }
  })
  var document2 = req.body.document2.trim();
  //var doc2filePath = '/Users/sekyunoh/Documents/nex/분납요구서&계약서/'+document2;
  var doc2filePath = '\root\OFFICE_HSNEX\0.HSNEX-공유\Pro.16년 7월 22일 이후 분할납품요구및통보서'+document2
  fs.writeFile(doc2filePath,function(error){
    if(error){
      console.log(error);
    }else{
      console.log('uploading success')
    }
  })

  if(document3_list1 != undefined){

    fs.writeFile(doc3filePath+document3_list1,function(error){
      if(error){
        console.log('err here1??')
        console.log(error);
      }else{
        console.log('uploading success')
      }
    })
  }

  if(document3_list2 != undefined){

    fs.writeFile(doc3filePath+document3_list2,function(error){
      if(error){
        console.log('err here2??')
        console.log(error);
      }else{
        console.log('uploading success')
      }
    })
  }

  if(document3_list3 != undefined){

    fs.writeFile(doc3filePath+document3_list3,function(error){
      if(error){
        console.log('err here3??')
        console.log(error);
      }else{
        console.log('uploading success')
      }
    })
  }

  if(document3_list4 != undefined){

    fs.writeFile(doc3filePath+document3_list4,function(error){
      if(error){
        console.log('err here4??')
        console.log(error);
      }else{
        console.log('uploading success')
      }
    })
  }

  if(document3_list5 != undefined){

    fs.writeFile(doc3filePath+document3_list5,function(error){
      if(error){
        console.log('err here5??')
        console.log(error);
      }else{
        console.log('uploading success')
      }
    })
  }

  if(document3_list6 != undefined){
    fs.writeFile(doc3filePath+document3_list6,function(error){
      if(error){
        console.log('err here6??')
        console.log(error);
      }else{
        console.log('uploading success')
      }
    })
  }

  if(document3_list7 != undefined){

    fs.writeFile(doc3filePath+document3_list7,function(error){
      if(error){
        console.log('err here7??')
        console.log(error);
      }else{
        console.log('uploading success')
      }
    })
  }

  var document4 = req.body.document4.trim();
  //var doc4filePath = '/Users/sekyunoh/Documents/nex/작업지시서/'+document4;
  var doc4filePath = '\root\OFFICE_HSNEX\0.HSNEX-공유\Pro.NEX-작업지시서 모음'+document4
  fs.writeFile(doc4filePath,function(error){
    if(error){
      console.log(error);
    }else{
      console.log('uploading success')
    }
  })
  var document5 = req.body.document5.trim();
  //var doc5filePath = '/Users/sekyunoh/Documents/nex/출고지시서/'+document5;
  var doc5filePath = '\root\OFFICE_HSNEX\0.HSNEX-공유\Pro.출고지시서 모음'+document5
  fs.writeFile(doc5filePath,function(error){
    if(error){
      console.log(error);
    }else{
      console.log('uploading success')
    }
  })

  var input_detail = 'insert into input_detail (acceptdate,reservationway,demandcompany,insalesman,outsalesman,nameofcontract,'+
  'sum,expectdate,deliver,setup,reference,process,document1,document2,'+
  'document3_list1_name,document3_list1,document3_list2_name,document3_list2,'+
  'document3_list3_name,document3_list3,document3_list4_name,document3_list4,'+
  'document3_list5_name,document3_list5,document3_list6_name,document3_list6,'+
  'document3_list7_name,document3_list7,document4,document5)'+ 'values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';

  conn.query(input_detail,[acceptdate,reservationway,demandcompany,insalesman,outsalesman,
    nameofcontract,sum,expectdate,deliver,setup,reference,box1,document1,document2,
    document3_list1_name,document3_list1,document3_list2_name,document3_list2,
  document3_list3_name,document3_list3,document3_list4_name,document3_list4,
  document3_list5_name,document3_list5,document3_list6_name,document3_list6,
  document3_list7_name,document3_list7,document4,document5],function(err,rows){
    if(err){
      console.log(err);
      res.status(500).send('input_detail_error!!');
    }else{
      res.redirect('/nexmain');
    }
  })
});

//delete
app.post('/delete', function(req, res){
  var id = req.body.Id;
  var deleteSql = 'delete from input_detail where id=?';

  conn.query(deleteSql,[id],function(err, rows){
    if(err){
      console.log(err);
      res.status(500).send('deleteError!');
    }else{
      res.redirect('/nexmain');
    }
  });
});

//revise
var id = 0;
app.post('/revise', function(req, res){
  id = req.body.Id;
  res.redirect('/revise');
});

app.get('/revise', function(req, res){
  //여기부터 수정된거 다시 데이터베이스 update!
  var reviseSql = 'select * from input_detail where id=?';

  conn.query(reviseSql, [id], function(err, rows){
    if(err){
      console.log(err);
      res.status(500).send('revise error!');
    }else{
      res.render('revise',{results:rows})
    }
  });
});

app.post('/revise/complete', function(req, res){

  var acceptdate = req.body.acceptdate;
  var reservationway = req.body.reservationway.trim();
  var demandcompany = req.body.demandcompany.trim();
  var insalesman = req.body.insalesman.trim();
  var outsalesman = req.body.outsalesman.trim();
  var nameofcontract = req.body.nameofcontract.trim();
  var sum = req.body.sum.trim();
  var expectdate = req.body.expectdate;
  var deliver = req.body.deliver.trim();
  var setup = req.body.setup.trim();
  var reference = req.body.reference.trim();
  var box1 = req.body.box1;
  var document3_list1 = req.body.document3_list1.trim()
  var document3_list2 = req.body.document3_list2.trim()
  var document3_list3 = req.body.document3_list3.trim()
  var document3_list4 = req.body.document3_list4.trim()
  var document3_list5 = req.body.document3_list5.trim()
  var document3_list6 = req.body.document3_list6.trim()
  var document3_list7 = req.body.document3_list7.trim()
  var document3_list1_name = req.body.document3_list1_name.trim();
  var document3_list2_name = req.body.document3_list2_name.trim();
  var document3_list3_name = req.body.document3_list3_name.trim();
  var document3_list4_name = req.body.document3_list4_name.trim();
  var document3_list5_name = req.body.document3_list5_name.trim();
  var document3_list6_name = req.body.document3_list6_name.trim();
  var document3_list7_name = req.body.document3_list7_name.trim();

  var update_detail = 'update input_detail SET acceptdate=?,reservationway=?,demandcompany=?,insalesman=?,outsalesman=?,nameofcontract=?,'+
  'sum=?,expectdate=?,deliver=?,setup=?,reference=?,process=? where id=?';

  conn.query(update_detail,[acceptdate,reservationway,demandcompany,insalesman,outsalesman,nameofcontract,sum,expectdate,deliver
  ,setup,reference,box1,id],function(err,rows){
    if(err){
      console.log(err);
      res.status(500).send('input_detail_error!!');
    }else{
      console.log('Updating detail succeed!')
      res.redirect('/nexmain');
    }
  })


  var doc1Revise = 'update input_detail SET document1=? where id=?'
  var document1 = req.body.document1.trim();
  if(document1 != undefined){
    //var doc1filePath = '/Users/sekyunoh/Documents/nex/견적서/'+document1;
    var doc1filePath = '\root\OFFICE_HSNEX\0.HSNEX-공유\Pro.NEX-견적서 모음'+document1
    fs.writeFile(doc1filePath,function(error){
      if(error){
        console.log(error);
      }else{
        conn.query(doc1Revise, [document1, id], function(err, rows){
          if(err){
            console.log(err);
            res.status(500).send('document1 update error!');
          }else{
            console.log('uploading success')
          }
        })
      }
    })
  }

  var doc2Revise = 'update input_detail SET document2=? where id=?'
  var document2 = req.body.document2.trim();
  if(document2 != undefined){
    //var doc2filePath = '/Users/sekyunoh/Documents/nex/분납요구서&계약서/'+document2;
    var doc2filePath = '\root\OFFICE_HSNEX\0.HSNEX-공유\Pro.16년 7월 22일 이후 분할납품요구및통보서'+document2
    fs.writeFile(doc2filePath,function(error){
      if(error){
        console.log(error);
      }else{
        conn.query(doc2Revise, [document2, id], function(err, rows){
          if(err){
            console.log(err);
            res.status(500).send('document2 update error!');
          }else{
            console.log('uploading success')
          }
        })
      }
    })
  }


  var doc3_list1Revise = 'update input_detail SET document3_list1=? where id=?'
  var doc3_list1_nameRevise = 'update input_detail SET document3_list1_name=? where id=?'
    //var doc3filePath = '/Users/sekyunoh/Documents/nex/발주서/'+document3_list1;
    var doc3filePath1 = '\root\OFFICE_HSNEX\0.HSNEX-공유\Pro.주문서(발주서) 모음'+document3_list1
    fs.writeFile(doc3filePath1,function(error){

        conn.query(doc3_list1Revise, [document3_list1, id], function(err, rows){
          if(err){
            console.log(err);
            res.status(500).send('document3_list1 update error!');
          }else{
            conn.query(doc3_list1_nameRevise, [document3_list1_name, id], function(err, rows){
              if(err){
                console.log(err);
                res.status(500).send('document3_list1_name update error!');
              }else{
                console.log('uploading success')
              }
            })
            console.log('uploading success')
          }
        })

    })


  var doc3_list2Revise = 'update input_detail SET document3_list2=? where id=?'
  var doc3_list2_nameRevise = 'update input_detail SET document3_list2_name=? where id=?'
    //var doc3filePath = '/Users/sekyunoh/Documents/nex/발주서/'+document3_list2;
    var doc3filePath2 = '\root\OFFICE_HSNEX\0.HSNEX-공유\Pro.주문서(발주서) 모음'+document3_list2
    fs.writeFile(doc3filePath2,function(error){

        conn.query(doc3_list2Revise, [document3_list2, id], function(err, rows){
          if(err){
            console.log(err);
            res.status(500).send('document3_list2 update error!');
          }else{
            conn.query(doc3_list2_nameRevise, [document3_list2_name, id], function(err, rows){
              if(err){
                console.log(err);
                res.status(500).send('document3_list2_name update error!');
              }else{
                console.log('uploading success')
              }
            })
            console.log('uploading success')
          }
        })

    })


  var doc3_list3Revise = 'update input_detail SET document3_list3=? where id=?'
  var doc3_list3_nameRevise = 'update input_detail SET document3_list3_name=? where id=?'

    //var doc3filePath = '/Users/sekyunoh/Documents/nex/발주서/'+document3_list3;
    var doc3filePath3 = '\root\OFFICE_HSNEX\0.HSNEX-공유\Pro.주문서(발주서) 모음'+document3_list3
    fs.writeFile(doc3filePath3,function(error){
        conn.query(doc3_list3Revise, [document3_list3, id], function(err, rows){
          if(err){
            console.log(err);
            res.status(500).send('document3_list3 update error!');
          }else{
            conn.query(doc3_list3_nameRevise, [document3_list3_name, id], function(err, rows){
              if(err){
                console.log(err);
                res.status(500).send('document3_list3_name update error!');
              }else{
                console.log('uploading success')
              }
            })
            console.log('uploading success')
          }
        })

    })


  var doc3_list4Revise = 'update input_detail SET document3_list4=? where id=?'
  var doc3_list4_nameRevise = 'update input_detail SET document3_list4_name=? where id=?'
    //var doc3filePath = '/Users/sekyunoh/Documents/nex/발주서/'+document3_list4;
    var doc3filePath4 = '\root\OFFICE_HSNEX\0.HSNEX-공유\Pro.주문서(발주서) 모음'+document3_list4
    fs.writeFile(doc3filePath4,function(error){

        conn.query(doc3_list4Revise, [document3_list4, id], function(err, rows){
          if(err){
            console.log(err);
            res.status(500).send('document3_list4 update error!');
          }else{
            conn.query(doc3_list4_nameRevise, [document3_list4_name, id], function(err, rows){
              if(err){
                console.log(err);
                res.status(500).send('document3_list4_name update error!');
              }else{
                console.log('uploading success')
              }
            })
            console.log('uploading success')
          }
        })

    })


  var doc3_list5Revise = 'update input_detail SET document3_list5=? where id=?'
  var doc3_list5_nameRevise = 'update input_detail SET document3_list5_name=? where id=?'
    //var doc3filePath = '/Users/sekyunoh/Documents/nex/발주서/'+document3_list5;
    var doc3filePath5 = '\root\OFFICE_HSNEX\0.HSNEX-공유\Pro.주문서(발주서) 모음'+document3_list5
    fs.writeFile(doc3filePath5,function(error){

        conn.query(doc3_list5Revise, [document3_list5, id], function(err, rows){
          if(err){
            console.log(err);
            res.status(500).send('document3_list5 update error!');
          }else{
            conn.query(doc3_list5_nameRevise, [document3_list5_name, id], function(err, rows){
              if(err){
                console.log(err);
                res.status(500).send('document3_list5_name update error!');
              }else{
                console.log('uploading success')
              }
            })
            console.log('uploading success')
          }
        })

    })


  var doc3_list6Revise = 'update input_detail SET document3_list6=? where id=?'
  var doc3_list6_nameRevise = 'update input_detail SET document3_list6_name=? where id=?'

    //var doc3filePath = '/Users/sekyunoh/Documents/nex/발주서/'+document3_list6;
    var doc3filePath6 = '\root\OFFICE_HSNEX\0.HSNEX-공유\Pro.주문서(발주서) 모음'+document3_list6
    fs.writeFile(doc3filePath6,function(error){

        conn.query(doc3_list6Revise, [document3_list6, id], function(err, rows){
          if(err){
            console.log(err);
            res.status(500).send('document3_list1 update error!');
          }else{
            conn.query(doc3_list6_nameRevise, [document3_list6_name, id], function(err, rows){
              if(err){
                console.log(err);
                res.status(500).send('document3_list6_name update error!');
              }else{
                console.log('uploading success')
              }
            })
            console.log('uploading success')
          }
        })

    })


  var doc3_list7Revise = 'update input_detail SET document3_list7=? where id=?'
  var doc3_list7_nameRevise = 'update input_detail SET document3_list7_name=? where id=?'
    //var doc3filePath = '/Users/sekyunoh/Documents/nex/발주서/'+document3_list7;
    var doc3filePath7 = '\root\OFFICE_HSNEX\0.HSNEX-공유\Pro.주문서(발주서) 모음'+document3_list7
    fs.writeFile(doc3filePath7,function(error){

        conn.query(doc3_list7Revise, [document3_list7, id], function(err, rows){
          if(err){
            console.log(err);
            res.status(500).send('document3_list7 update error!');
          }else{
            conn.query(doc3_list7_nameRevise, [document3_list7_name, id], function(err, rows){
              if(err){
                console.log(err);
                res.status(500).send('document3_list7_name update error!');
              }else{
                console.log('uploading success')
              }
            })
            console.log('uploading success')
          }
        })

    })


  var doc4Revise = 'update input_detail SET document4=? where id=?'
  var document4 = req.body.document4.trim();
  if(document4 != undefined){
    //var doc4filePath = '/Users/sekyunoh/Documents/nex/작업지시서/'+document4;
    var doc4filePath = '\root\OFFICE_HSNEX\0.HSNEX-공유\Pro.NEX-작업지시서 모음'+document4
    fs.writeFile(doc4filePath,function(error){
      if(error){
        console.log(error);
      }else{
        conn.query(doc4Revise, [document4, id], function(err, rows){
          if(err){
            console.log(err);
            res.status(500).send('document4 update error!');
          }else{
            console.log('uploading success')
          }
        })
      }
    })
  }

  var doc5Revise = 'update input_detail SET document5=? where id=?'
  var document5 = req.body.document5.trim();
  if(document5 != undefined){
    //var doc5filePath = '/Users/sekyunoh/Documents/nex/출고지시서/'+document5;
    var doc5filePath = '\root\OFFICE_HSNEX\0.HSNEX-공유\Pro.출고지시서 모음'+document5
    fs.writeFile(doc5filePath,function(error){
      if(error){
        console.log(error);
      }else{
        conn.query(doc5Revise, [document5, id], function(err, rows){
          if(err){
            console.log(err);
            res.status(500).send('document5 update error!');
          }else{
            console.log('uploading success')
          }
        })
      }
    })
  }
});



//출고준비완료
var string = null;
var sql = 'select * from input_detail where process=?';

app.post('/btn1', function(req, res){
  string = req.body.string;
  res.redirect('/btn1');
});

app.get('/btn1', function(req, res){
  conn.query(sql,[string],function(err, rows){
    if(err){
      console.log(err);
      res.status(500).send('btn1 error');
    }else{
      res.render('nexmain', {btnresults:rows})
    }
  });
});

//출고완료
app.post('/btn2', function(req, res){
  string = req.body.string;
  res.redirect('/btn2');
})

app.get('/btn2', function(req, res){
  conn.query(sql,[string],function(err, rows){
    if(err){
      console.log(err);
      res.status(500).send('btn2 error');
    }else{
      res.render('nexmain',{btnresults:rows})
    }
  });
})

//검사/검수요청완료
app.post('/btn3', function(req, res){
  string = req.body.string;
  res.redirect('/btn3');
})

app.get('/btn3', function(req, res){
  conn.query(sql,[string],function(err, rows){
    if(err){
      console.log(err);
      res.status(500).send('btn3 error');
    }else{
      res.render('nexmain',{btnresults:rows})
    }
  });
})

//세금계산서완료
app.post('/btn4', function(req, res){
  string = req.body.string;
  res.redirect('/btn4');

})

app.get('/btn4', function(req, res){

    conn.query(sql,[string],function(err, rows){
      if(err){
        console.log(err);
        res.status(500).send('btn4 error');
      }else{
        res.render('nexmain',{btnresults:rows})
      }
    });
})

//입금완료
app.post('/btn5', function(req, res){
  string = req.body.string;
  res.redirect('/btn5');
})

app.get('/btn5', function(req, res){
  conn.query(sql,[string],function(err, rows){
    if(err){
      console.log(err);
      res.status(500).send('btn5 error');
    }else{
      res.render('nexmain',{btnresults:rows})
    }
  });
})

//정산완료
app.post('/btn6', function(req, res){
  string = req.body.string;
  res.redirect('/btn6');
})

app.get('/btn6', function(req, res){
  conn.query(sql,[string],function(err, rows){
    if(err){
      console.log(err);
      res.status(500).send('btn6 error');
    }else{
      res.render('nexmain',{btnresults:rows})
    }
  });
})

//A/S발생
app.post('/btn7', function(req, res){
  string = req.body.string;
  res.redirect('/btn7');
})

app.get('/btn7', function(req, res){
  conn.query(sql,[string],function(err, rows){
    if(err){
      console.log(err);
      res.status(500).send('btn7 error');
    }else{
      res.render('nexmain',{btnresults:rows})
    }
  });
})

//처리완료
app.post('/btn8', function(req, res){
  string = req.body.string;
  res.redirect('/btn8');
})

app.get('/btn8', function(req, res){
  conn.query(sql,[string],function(err, rows){
    if(err){
      console.log(err);
      res.status(500).send('btn8 error');
    }else{
      res.render('nexmain',{btnresults:rows})
    }
  });
})


app.listen(3000, function(){
  console.log('The nex.js is Connected to 3000, port!');
});
