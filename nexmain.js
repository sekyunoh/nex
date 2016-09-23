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
var client = require('scp2')
var excel = require('xlsx')
var fs_extra = require('fs-extra')
var multer = require('multer');

/*var upload = multer({ dest: __dirname+'/download/',
                    filename: function (req, file, cb) {
                      console.log('req: ' + req + 'file: ' + file)
                    cb(null, file)
}})*/

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        //cb(null, __dirname + '/download/')

        if(file.fieldname == 'document1'){
          cb(null, __dirname+'/estimate_sheet/')
          //cb(null, '/home/OFFICE_HSNEX/a')

        }else if(file.fieldname == 'document2'){
          cb(null, __dirname+'/contract_sheet/')

        }else if(file.fieldname == 'document3_list1'||file.fieldname == 'document3_list2'||file.fieldname == 'document3_list3'||file.fieldname == 'document3_list4'||file.fieldname == 'document3_list5'||file.fieldname == 'document3_list6'||file.fieldname == 'document3_list7'){
          cb(null, __dirname+'/order_draft_sheet/')

        }else if(file.fieldname == 'document4'){
          cb(null, __dirname+'/job_order_sheet/')

        }else if(file.fieldname == 'document5'){
          cb(null, __dirname+'/unstore_sheet/')

        }
    },
    filename: function (req, file, cb) {
      //console.log('req.file.filename: ' +file.originalname)
        cb(null, file.originalname)//originalname
    }
});

var work_info_storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + '/download/')

    },
    filename: function (req, file, cb) {
      //console.log('req.file.filename: ' +file.originalname)
        cb(null, file.originalname)//originalname
    }
});

var upload = multer({ storage: storage });
var work_info_upload = multer({storage: work_info_storage})



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

app.get('/dialog/:id', function(req, res){
  dialog.showOpenDialog({ properties: [ 'openFile', 'multiSelections',function(fileNames){
    console.log(fileNames);
  }]});
  //require('child_process').spawn('window', ['/Users/sekyunoh/Documents/nex/download'])
})

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

app.get('/statistics', function(req, res){
  res.render('statistics')
})

app.post('/statistics/search', function(req, res){
  var fromdate = req.body.fromdate
  var enddate = req.body.enddate
  var demander = req.body.demander

  var fromdateArray = fromdate.split('-');
  var enddateArray = enddate.split('-')
  var fromdateObj = new Date(fromdateArray[0], Number(fromdateArray[1])-1, fromdateArray[2]);
  var enddateObj = new Date(enddateArray[0], Number(enddateArray[1])-1, enddateArray[2]);
  var betweenDay = (enddateObj.getTime() - fromdateObj.getTime())/1000/60/60/24;
  //console.log('fromdateObj ' + fromdateObj.getTime() + ' - ' + 'enddateObj ' + enddateObj.getTime())

  for(var i = 0; i <= betweenDay; i++){
    console.log(new Date(fromdateArray[0], Number(fromdateArray[1])-1, Number(fromdateArray[2])+i))
  }

  console.log('betweenday is ' + betweenDay)
  res.redirect('/statistics')

})

//날짜 차이 계산하여 날짜 형태로 리턴
function getDiffDate(diffValue, mode) {
    var currentDate = document.getElementById("CurrentDate").value.split('-');
    var tempDate = new Date(currentDate[0],currentDate[1]-1,currentDate[2]);
    switch ( mode ) {
    case undefined:
        tempDate.setDate(tempDate.getDate() - diffValue);            // day
        break;
    case "Week":
        tempDate.setDate(tempDate.getDate() - diffValue*7);          // week
        break;
    case "Month":
        tempDate.setMonth(tempDate.getMonth() - diffValue);          // month
        break;
    case "Year":
        tempDate.setYear(tempDate.getYear() - diffValue);            // year
        break;
    }
    return tempDate.getFullYear()+"-"+("0" + (tempDate.getMonth() + 1)).slice(-2)+"-"+("0" + tempDate.getDate()).slice(-2);
}

//openExcel
app.post('/download/:id', function(req, res){
  var filename = req.params.id
  //var url = '/Users/sekyunoh/Documents/nex/견적서/sample.xls'
  //var oReq = new XMLHttpRequest();
  //oReq.open("GET", url, true);
  //excel.openFile('/Users/sekyunoh/Documents/nex/견적서/sample.xls')
  Filepath = __dirname + '/download/' + filename
  res.download(Filepath)
})

//nexmain
app.get('/nexmain',function(req, res){
  var selectdetail_info = 'select * from input_detail';
  var select_message = 'select * from message'
  //var select_feedback = 'select * from feedback'

  conn.query(selectdetail_info,function(err, rows){
    if(err){
      console.log(err);
      res.status(500).send('select from input_detail error!');
    }else{
      conn.query(select_message , function(err1, rows1){
        if(err1){
          console.log(err1);
          res.status(500).send('select from message error!');
        }else{
          res.render('nexmain',{results:rows, message: rows1});
        }
      })
    }
  });

});

app.get('/getFiles', function(req, res){
  console.log('it comes')
  /*fs.readdir('/Users/sekyunoh/Documents/nex/견적서/', function(err, files) {
    if (err) return;
    console.log('Files: ' + files);*/
    res.render('sidebar', {Files: files})
  //})
})

//수주대장작성
app.get('/registerdetail', function(req, res){
  res.render('registerdetail')
});

//견적서
app.get('/Users/sekyunoh/Documents/nex/estimate_sheet/:id', function(req, res){

  Filepath = __dirname + '/estimate_sheet/' + req.params.id
  res.download(Filepath)

})

//분납요구서&계약서
app.get('/Users/sekyunoh/Documents/nex/contract_sheet/:id', function(req, res){

  Filepath = __dirname + '/contract_sheet/' + req.params.id
  res.download(Filepath)

})
//발주서
app.get('/Users/sekyunoh/Documents/nex/order_draft_sheet/:id', function(req, res){

  Filepath = __dirname + '/order_draft_sheet/' + req.params.id
  res.download(Filepath)

})
//작업지시서
app.get('/Users/sekyunoh/Documents/nex/job_order_sheet/:id', function(req, res){

  Filepath = __dirname + '/job_order_sheet/' + req.params.id
  res.download(Filepath)

})
//출고지시서
app.get('/Users/sekyunoh/Documents/nex/unstore_sheet/:id', function(req, res){

  Filepath = __dirname + '/unstore_sheet/' + req.params.id
  res.download(Filepath)

})
//전달사항
app.get('/Users/sekyunoh/Documents/nex/download/', function(req, res){
  Filepath = __dirname + '/download/admin.jade'
  res.download(Filepath)
})

app.post('/registerdetail/complete',
upload.fields([{ name: 'document1', maxCount: 1 }, { name: 'document2', maxCount: 1 },
{ name: 'document3_list1', maxCount: 1 }, { name: 'document3_list2', maxCount: 1 },
{ name: 'document3_list3', maxCount: 1 }, { name: 'document3_list4', maxCount: 1 },
{ name: 'document3_list5', maxCount: 1 }, { name: 'document3_list6', maxCount: 1 },
{ name: 'document3_list7', maxCount: 1 }, { name: 'document4', maxCount: 1 }, { name: 'document5', maxCount: 1 }]),function(req, res){

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

  var document1 = ''
  var document2 = ''
  var document4 = ''
  var document5 = ''
  var document3_list1 = ''
  var document3_list2 = ''
  var document3_list3 = ''
  var document3_list4 = ''
  var document3_list5 = ''
  var document3_list6 = ''
  var document3_list7 = ''

  if(req.files.document1 != undefined){
      document1 = req.files.document1[0].filename
      //console.log('FILES:::: ' + req.files.document1)
  }else{
      document1 = null
  }
  if(req.files.document2 != undefined){
      document2 = req.files.document2[0].filename
  }else{
      document2 = null
  }
  if(req.files.document4 != undefined){
      document4 = req.files.document4[0].filename
  }else{
      document4 = null
  }
  if(req.files.document5 != undefined){
      document5 = req.files.document5[0].filename
  }else{
      document5 = null
  }
  if(req.files.document3_list1 != undefined){
      document3_list1 = req.files.document3_list1[0].filename
  }else{
      document3_list1 = null
  }
  if(req.files.document3_list2 != undefined){
      document3_list2 = req.files.document3_list2[0].filename
  }else{
      document3_list2 = null
  }
  if(req.files.document3_list3 != undefined){
      document3_list3 = req.files.document3_list3[0].filename
  }else{
      document3_list3 = null
  }
  if(req.files.document3_list4 != undefined){
      document3_list4 = req.files.document3_list4[0].filename
  }else{
      document3_list4 = null
  }
  if(req.files.document3_list5 != undefined){
      document3_list5 = req.files.document3_list5[0].filename
  }else{
      document3_list5 = null
  }
  if(req.files.document3_list6 != undefined){
      document3_list6 = req.files.document3_list6[0].filename
  }else{
      document3_list6 = null
  }
  if(req.files.document3_list7 != undefined){
      document3_list7 = req.files.document3_list7[0].filename
  }else{
      document3_list7 = null
  }


  var document3_list1_name = req.body.document3_list1_name.trim()
  var document3_list2_name = req.body.document3_list2_name.trim()
  var document3_list3_name = req.body.document3_list3_name.trim()
  var document3_list4_name = req.body.document3_list4_name.trim()
  var document3_list5_name = req.body.document3_list5_name.trim()
  var document3_list6_name = req.body.document3_list6_name.trim()
  var document3_list7_name = req.body.document3_list7_name.trim()



  //console.log(req.files.document1[0].filename)

  var input_detail = 'insert into input_detail (acceptdate,reservationway,demandcompany,insalesman,outsalesman,nameofcontract,'+
  'sum,expectdate,deliver,setup,reference,process)'+ 'values(?,?,?,?,?,?,?,?,?,?,?,?)';

  var documents_sql = 'insert into documents (id, document1, document2, document3_list1_name, document3_list1, document3_list2_name, document3_list2, document3_list3_name, document3_list3, document3_list4_name, document3_list4, document3_list5_name, document3_list5, document3_list6_name, document3_list6, document3_list7_name, document3_list7, document4, document5) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'

  conn.query(input_detail,[acceptdate,reservationway,demandcompany,insalesman,outsalesman,
    nameofcontract,sum,expectdate,deliver,setup,reference,box1],function(err,rows){
    if(err){
      console.log(err);
      res.status(500).send('input_detail_error!!');
    }else{
      conn.query(documents_sql, [rows.insertId,document1, document2,document3_list1_name,document3_list1,document3_list2_name,document3_list2,document3_list3_name,document3_list3,document3_list4_name,document3_list4,document3_list5_name,document3_list5,document3_list6_name,document3_list6,document3_list7_name,document3_list7, document4, document5], function(err1, rows1){
        if(err1){
          console.log(err1)
          res.status(500).send('documents_sql error!');
        }else{
          res.redirect('/nexmain');
        }
      });
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
  var input_detail = 'select * from input_detail where id=?'
  var reviseSql = 'select * from documents where id=?';

  conn.query(input_detail,[id],function(err0, rows0){
    if(err0){
      console.log(err0)
      res.status.send('input_datail for revising error!')
    }else{
      conn.query(reviseSql, [id], function(err, rows){
        if(err){
          console.log(err);
          res.status(500).send('revise error!');
        }else{
          res.render('revise',{results:rows0, documents: rows})
        }
      });
    }
  })

});

app.post('/revise/complete',
upload.fields([{ name: 'document1', maxCount: 1 }, { name: 'document2', maxCount: 1 },
{ name: 'document3_list1', maxCount: 1 }, { name: 'document3_list2', maxCount: 1 },
{ name: 'document3_list3', maxCount: 1 }, { name: 'document3_list4', maxCount: 1 },
{ name: 'document3_list5', maxCount: 1 }, { name: 'document3_list6', maxCount: 1 },
{ name: 'document3_list7', maxCount: 1 }, { name: 'document4', maxCount: 1 }, { name: 'document5', maxCount: 1 }]) ,function(req, res){

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

  var document1 = ''
  var document2 = ''
  var document4 = ''
  var document5 = ''
  var document3_list1 = ''
  var document3_list2 = ''
  var document3_list3 = ''
  var document3_list4 = ''
  var document3_list5 = ''
  var document3_list6 = ''
  var document3_list7 = ''

  if(req.files.document1 != undefined){
      document1 = req.files.document1[0].filename
  }else{
      document1 = null
  }
  if(req.files.document2 != undefined){
      document2 = req.files.document2[0].filename
  }else{
      document2 = null
  }
  if(req.files.document4 != undefined){
      document4 = req.files.document4[0].filename
  }else{
      document4 = null
  }
  if(req.files.document5 != undefined){
      document5 = req.files.document5[0].filename
  }else{
      document5 = null
  }
  if(req.files.document3_list1 != undefined){
      document3_list1 = req.files.document3_list1[0].filename
  }else{
      document3_list1 = null
  }
  if(req.files.document3_list2 != undefined){
      document3_list2 = req.files.document3_list2[0].filename
  }else{
      document3_list2 = null
  }
  if(req.files.document3_list3 != undefined){
      document3_list3 = req.files.document3_list3[0].filename
  }else{
      document3_list3 = null
  }
  if(req.files.document3_list4 != undefined){
      document3_list4 = req.files.document3_list4[0].filename
  }else{
      document3_list4 = null
  }
  if(req.files.document3_list5 != undefined){
      document3_list5 = req.files.document3_list5[0].filename
  }else{
      document3_list5 = null
  }
  if(req.files.document3_list6 != undefined){
      document3_list6 = req.files.document3_list6[0].filename
  }else{
      document3_list6 = null
  }
  if(req.files.document3_list7 != undefined){
      document3_list7 = req.files.document3_list7[0].filename
  }else{
      document3_list7 = null
  }

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


  var doc1Revise = 'update documents SET document1=? where id=?'

  if(document1 != undefined){
    conn.query(doc1Revise, [document1, id], function(err, rows){
      if(err){
        console.log('update doc1: '+err);
      }else{

      }
    })
  }

  var doc2Revise = 'update documents SET document2=? where id=?'

  if(document2 != undefined){
    conn.query(doc2Revise, [document2, id], function(err, rows){
      if(err){
        console.log('update doc2: '+err);
      }else{

      }
    })
  }


  var doc3_list1Revise = 'update documents SET document3_list1_name=?,document3_list1=? where id=?'
  //var doc3_list1_nameRevise = 'update documents SET document3_list1_name=? where id=?'

  if(document3_list1 != undefined){
    conn.query(doc3_list1_Revise, [document3_list1_name,document3_list1,id], function(err, rows){
      if(err){
        console.log('update doc3_list1 error');
      }else{

      }
    })
  }

  var doc3_list2Revise = 'update documents SET document3_list2_name=?,document3_list2=? where id=?'
  //var doc3_list2_nameRevise = 'update documents SET document3_list2_name=? where id=?'

  if(document3_list2 != undefined){
    conn.query(doc3_list2_Revise, [document3_list2_name,document3_list2,id], function(err, rows){
      if(err){
        console.log('update doc3_list2 error');
      }else{

      }
    })
  }

  var doc3_list3Revise = 'update documents SET document3_list3_name=?,document3_list3=? where id=?'
  //var doc3_list3_nameRevise = 'update documents SET document3_list3_name=? where id=?'

  if(document3_list3 != undefined){
    conn.query(doc3_list3_Revise, [document3_list3_name,document3_list3,id], function(err, rows){
      if(err){
        console.log('update doc3_list3 error');
      }else{

      }
    })
  }

  var doc3_list4Revise = 'update documents SET document3_list4_name=?,document3_list4=? where id=?'
  //var doc3_list4_nameRevise = 'update documents SET document3_list4_name=? where id=?'

  if(document3_list4 != undefined){
    conn.query(doc3_list4_Revise, [document3_list4_name,document3_list4,id], function(err, rows){
      if(err){
        console.log('update doc3_list4 error');
      }else{

      }
    })
  }

  var doc3_list5Revise = 'update documents SET document3_list5_name=?,document3_list5=? where id=?'
  //var doc3_list5_nameRevise = 'update documents SET document3_list5_name=? where id=?'

  if(document3_list5 != undefined){
    conn.query(doc3_list5_Revise, [document3_list5_name,document3_list5,id], function(err, rows){
      if(err){
        console.log('update doc3_list5 error');
      }else{

      }
    })
  }

  var doc3_list6Revise = 'update documents SET document3_list6_name=?,document3_list6=? where id=?'
  //var doc3_list6_nameRevise = 'update documents SET document3_list6_name=? where id=?'

  if(document3_list6 != undefined){
    conn.query(doc3_list6_Revise, [document3_list6_name,document3_list6,id], function(err, rows){
      if(err){
        console.log('update doc3_list6 error');
      }else{

      }
    })
  }

  var doc3_list7Revise = 'update documents SET document3_list7_name=?,document3_list7=? where id=?'
  //var doc3_list7_nameRevise = 'update documents SET document3_list7_name=? where id=?'

  if(document3_list7 != undefined){
    conn.query(doc3_list7_Revise, [document3_list7_name,document3_list7,id], function(err, rows){
      if(err){
        console.log('update doc3_list7 error');
      }else{

      }
    })
  }


  var doc4Revise = 'update documents SET document4=? where id=?'

  if(document4 != undefined){
    conn.query(doc4Revise, [document4, id], function(err, rows){
      if(err){
        console.log('update doc4: '+err);
      }else{

      }
    })
  }

  var doc5Revise = 'update input_detail SET document5=? where id=?'

  if(document5 != undefined){
    conn.query(doc5Revise, [document5, id], function(err, rows){
      if(err){
        console.log('update doc5: '+err);
      }else{

      }
    })
  }
});

app.post('/message', work_info_upload.single('work_info'),function(req, res){
  var message = ''
  //console.log('filename is: '+req.file.filename)
  if(req.file.filename != undefined){
      message = req.file.filename
  }else{
      message = null
  }

  var name = req.session.passport.user
  var date = new Date()
  var today = date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+'  '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds()
  console.log('today: ' + today)

  var insertinto_message = 'insert into message (name, message, date) values (?,?,?)'
  conn.query(insertinto_message,[name, message, today],function(err, rows){
    if(err){
      console.log('insertinto_message error' + err);
      res.status(500).send('insertinto_message error')
    }else{
      res.redirect('/nexmain')
    }
  })
})


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
