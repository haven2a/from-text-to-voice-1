const Parse = require('parse/node');

// تأكد من تهيئة Parse
Parse.initialize("APPLICATION_ID", "JAVASCRIPT_KEY");
Parse.serverURL = 'https://parseapi.back4app.com/';

// تحميل ملف HTML باستخدام base64 أو ملف مباشر
const file = new Parse.File("example.html", { base64: "data:text/html;base64,...your base64 content..." });

// رفع الملف
file.save().then(() => {
  console.log("File uploaded successfully");
}).catch(error => {
  console.error("Error while uploading file:", error);
});
