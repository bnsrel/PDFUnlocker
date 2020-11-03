const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const contentDisposition = require('content-disposition');

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));


// set multer options
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function(req, file, cb) {
    cb(null, 'temp.pdf');
  }
});

// filter by file type
const fileFilter = (req, file, cb) => {
    // allow only pdf file extension
    const filetypes = /pdf/;
    
    // check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    // check mime type
    const mimetype = filetypes.test(file.mimetype);

    if(mimetype && extname){
        cb(null,true);
    } else {
        cb(null, false);
    }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 },
  fileFilter: fileFilter
}).single('myFile');

const exec = require('child_process').exec;
app.post('/upload', (req, res) => {
  upload(req, res, (err) => {
    if (err || !req.file) {
      return res.status(400).send('Please upload a pdf file up to 10Mb');
    }else {

      // using temp.pdf file name to avoid file name errors
      const outputPath = `./uploads/${req.file.filename.split('.')[0]}_dec.pdf`;

      const cmd = `qpdf --decrypt --password=${req.body.pass} ${req.file.path} ${outputPath}`;

      exec(cmd, function (err) {
        if (err) {
          cleanUploadsDir();
          return res.status(400).send('wrong or missing password');
        } else {

          const decryptedName = req.file.originalname.split('.')[0] + '_dec.pdf';

          res.writeHead(200, {
            'Content-Disposition': contentDisposition(decryptedName),
            'Content-Transfer-Encoding': 'binary'
          });

          const readStream = fs.createReadStream(outputPath);
          readStream.pipe(res);
          readStream.on('end', err => {
            if (!err) {
              // delete decrypted from uploads
              fs.unlink(outputPath, err => {
                if (err) {
                  console.log(err);
                }
              });
            }
            // delete original from uploads
            fs.unlink(req.file.path, err => {
              if (err) {
                console.log(err);
              }
            });

          });
        }
      });
    }
  });
});


function cleanUploadsDir() {
  if (fs.readdirSync("./uploads").length !== 0) {
    fs.rmdirSync('./uploads', { recursive: true });
    fs.mkdirSync('./uploads')
}
}


app.listen(PORT, () => console.log(`Server run on ${PORT} port`));
