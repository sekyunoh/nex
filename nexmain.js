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
    password:'Dhtp12rbs.',
    database: 'nex'
  })
}));


var mysql = require('mysql');
var conn = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'Dhtp12rbs.',
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
  var reservationway = req.body.reservationway;
  var demandcompany = req.body.demandcompany;
  var salesman = req.body.salesman;
  var nameofcontract = req.body.nameofcontract;
  var sum = req.body.sum;
  var expectdate = req.body.expectdate;
  var deliver = req.body.deliver;
  var setup = req.body.setup;
  var reference = req.body.reference;
  var box1 = req.body.box1;
  var document1 = req.body.document1;
  var doc1filePath = '/Users/sekyunoh/Documents/nex/견적서/'+document1;
  fs.writeFile(doc1filePath,function(error){
    if(error){
      console.log(error);
    }else{
      console.log('uploading success')
    }
  })
  var document2 = req.body.document2;
  var doc2filePath = '/Users/sekyunoh/Documents/nex/분납요구서&계약서/'+document2;
  fs.writeFile(doc2filePath,function(error){
    if(error){
      console.log(error);
    }else{
      console.log('uploading success')
    }
  })
  var document3 = req.body.document3;
  var doc3filePath = '/Users/sekyunoh/Documents/nex/발주서/'+document3;
  fs.writeFile(doc3filePath,function(error){
    if(error){
      console.log(error);
    }else{
      console.log('uploading success')
    }
  })
  var document4 = req.body.document4;
  var doc4filePath = '/Users/sekyunoh/Documents/nex/작업지시서/'+document4;
  fs.writeFile(doc4filePath,function(error){
    if(error){
      console.log(error);
    }else{
      console.log('uploading success')
    }
  })
  var document5 = req.body.document5;
  var doc5filePath = '/Users/sekyunoh/Documents/nex/출고지시서/'+document5;
  fs.writeFile(doc5filePath,function(error){
    if(error){
      console.log(error);
    }else{
      console.log('uploading success')
    }
  })

  var input_detail = 'insert into input_detail (acceptdate,reservationway,demandcompany,salesman,nameofcontract,'+
  'sum,expectdate,deliver,setup,reference,process,document1,document2,document3,document4,document5) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';

  conn.query(input_detail,[acceptdate,reservationway,demandcompany,salesman,nameofcontract,sum,expectdate,deliver
  ,setup,reference,box1,document1,document2,document3,document4,document5],function(err,rows){
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
