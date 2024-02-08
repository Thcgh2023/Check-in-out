var SPREADSHEET_ID = '1gErfBELM6hSGTqx0xapkAfdhRjZ_BK7zhXMdRcLWm2w';
var FOLDER_ID = '1XsYKU5SHQumvZnC4Q1CWrP10LtDgtegZ';
var SHEET_NAME = 'DATA';
var SPREADSHEET_ID_MEMBER = '1gErfBELM6hSGTqx0xapkAfdhRjZ_BK7zhXMdRcLWm2w';
var SHEET_NAME_MEMBER = 'MEMBER';
var LINE_NOTIFY_TOKEN = 'Rke3b7K8Qgslvoupuij3foPCbo4V4CRicRlAvWRJHEu';

//var LINE_NOTIFY_TOKEN = 'Y1QlXVdTKwWwk7PzwWG72QM54OvvsrWjw8KDnzQgdrR';

function sendLineNotifyMessage(message, imageUrl) {
  var url = 'https://notify-api.line.me/api/notify';
  var headers = {
    'Authorization': 'Bearer ' + LINE_NOTIFY_TOKEN,
  };
  var payload = {
    'message': message,
    'imageThumbnail': imageUrl,
    'imageFullsize': imageUrl,
  };
  var options = {
    'method': 'post',
    'headers': headers,
    'payload': payload,
  };
  UrlFetchApp.fetch(url, options);
}

function generateStaticMapImageUrl(lat, long) {
  var map = Maps.newStaticMap()
    .setSize(400, 400)
    .setZoom(15)
    .addMarker(lat, long)
    .setFormat(Maps.StaticMap.Format.PNG)
    .setLanguage('en');

  var mapBlob = map.getBlob();
  var folder = DriveApp.getFolderById(FOLDER_ID);

  var imageName = 'map_image_' + Utilities.formatDate(new Date(), 'GMT+7', 'dd-MM-yyyy_HH:mm:ss') + '.png';
  var file = folder.createFile(mapBlob);
  file.setName(imageName);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Get the file URL
  var fileUrl = file.getDownloadUrl();

  // Since DriveApp.getDownloadUrl() is deprecated, use DriveApp.getFileById().getDownloadUrl() as an alternative
  if (fileUrl) {
    fileUrl = DriveApp.getFileById(file.getId()).getDownloadUrl();
  }

  return fileUrl;
}

function generateFileUrl(data) {
  var imageName = data.name + '_' + Utilities.formatDate(new Date(), 'GMT+7', 'dd-MM-yyyy_HH:mm:ss') + '.png';
  var decodedImage = Utilities.base64Decode(data.base64);
  var blob = Utilities.newBlob(decodedImage, 'image/png', imageName);
  var folder = DriveApp.getFolderById(FOLDER_ID);

  // Create file and set sharing settings
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var fileUrl = DriveApp.getFileById(file.getId()).getDownloadUrl();

  return fileUrl;
}

function doPost(e) {
  try {
    var sheet;

    let obj = JSON.parse(e.postData.contents);

    if (obj.hasOwnProperty('nameId')) {
      // This block handles the first case (image upload)
      sheet = SpreadsheetApp.openById(SPREADSHEET_ID_MEMBER).getSheetByName(SHEET_NAME_MEMBER);

      // ดึงข้อมูลเพิ่มเติม
      let userlineId = obj.userlineId;
      let nameId = obj.nameId;
      let numberId = obj.numberId;
      let roleId = obj.roleId;

      // ถอดรหัสข้อมูล base64 และสร้าง Blob
      let decodedData = Utilities.base64Decode(obj.base64);
      let blob = Utilities.newBlob(decodedData, obj.type, obj.name);

      // สร้างไฟล์ใหม่ใน Google Drive ภายในโฟลเดอร์ที่ระบุและรับลิงก์ที่สามารถแชร์ได้
      let folderId = '16JXFu9UMqnWUExgFwNX7BBiZj6oVGQZt';
      let folder = DriveApp.getFolderById(folderId);
      let newFile = folder.createFile(blob);
      let link = newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW).getDownloadUrl();

      // รับแถวสุดท้ายในชีท
      let lr = sheet.getLastRow();

      // ตั้งสูตรและค่าในคอลัมน์เพิ่มเติมสำหรับ nameid, numberid, และ roleid
      sheet.getRange(lr + 1, 1).setValue(userlineId);
      sheet.getRange(lr + 1, 2).setValue(nameId);
      sheet.getRange(lr + 1, 3).setValue(numberId);
      sheet.getRange(lr + 1, 4).setValue(roleId);
      sheet.getRange(lr + 1, 5).setValue(link);


        // เรียกใช้ changeRichMenu() ทันที
        changeRichMenu();
        onEdit(e);
        // ส่งข้อความสำเร็จ

      // ส่งข้อความสำเร็จ
      return ContentService.createTextOutput("image uploaded");
    } else {
      // This block handles the second case (Line notification)
      sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

      var data = obj; // Assuming 'data' is used to represent Line notification data

      // Update spreadsheet
      if (!sheet) {
        sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(SHEET_NAME);
        sheet.appendRow(['Timestamp', 'Image URL', 'name', 'role', 'job', 'note', 'today', 'time', 'address', 'lat', 'long', 'user']);
      }

      // Generate fileUrl
      var fileUrl = generateFileUrl(data);

      sheet.appendRow([Utilities.formatDate(new Date(), 'GMT+7', 'dd-MM-yyyy HH:mm:ss'), fileUrl, data.name, data.role, data.job, data.note, data.today, data.time, data.address, data.lat, data.long, data.user]);

      // Generate static map image URL
      var mapImageUrl = generateStaticMapImageUrl(data.lat, data.long);

      // Create Line notification message
      var formattedDate = Utilities.formatDate(new Date(data.today), 'GMT+7', 'dd/MM/yyyy');
      var basicMessage = '\n⏰ บันทึกเวลา: ' + data.job + '\n👤 ชื่อ: ' + data.name + '\n💼 เลขที่พนักงาน: ' + data.role + '\n📝 หมายเหตุ: ' + data.note + '\n📅 วันที่: ' + formattedDate + '\n🕒 เวลา: ' + data.time + '\n🏠 ที่อยู่: ' + data.address;

      // Send Line notification
      sendLineNotifyMessage(basicMessage, mapImageUrl);

      return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);
    }
  } catch (error) {
    console.error(error);
    return ContentService.createTextOutput('Error').setMimeType(ContentService.MimeType.TEXT);
  }
}

function changeRichMenu() {
  var accessToken = 'AeLSiEVjkFmPK2/Js066boPPQP+4Hc+TiaUxqYIrm28tOiiTXRn2XsnZ+rhX99M9bHI2fCYiaDAnEgl9Em04zL6M73S7Wpb6zoyboT5w58krBGlW48Jbm13qTc2rdv7nztY+VEUunKIqF0eKswt5dAdB04t89/1O/w1cDnyilFU=';
  var sheetId = '1gErfBELM6hSGTqx0xapkAfdhRjZ_BK7zhXMdRcLWm2w';
  var sheetName = 'MEMBER';

  var sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
  var data = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();

  for (var i = 1; i < data.length; i++) {
    var userId = data[i][0];
    var richMenuId = 'richmenu-d0113b5d99127544617ca47a6e826693'; // Set the desired Rich Menu ID here

    var apiUrl = 'https://api.line.me/v2/bot/user/' + userId + '/richmenu/' + richMenuId;

    var headers = {
      'Authorization': 'Bearer ' + accessToken,
    };

    var options = {
      'method': 'post',
      'headers': headers,
    };

    var response = UrlFetchApp.fetch(apiUrl, options);

    Logger.log(response.getContentText());
  }
}
