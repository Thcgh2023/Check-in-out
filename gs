var SPREADSHEET_ID = '1gErfBELM6hSGTqx0xapkAfdhRjZ_BK7zhXMdRcLWm2w';
var FOLDER_ID = '1XsYKU5SHQumvZnC4Q1CWrP10LtDgtegZ';
var SHEET_NAME = 'DATA';
var SPREADSHEET_ID_MEMBER = '1gErfBELM6hSGTqx0xapkAfdhRjZ_BK7zhXMdRcLWm2w';
var SHEET_NAME_MEMBER = 'MEMBER';
var LINE_NOTIFY_TOKEN = 'WCIKxDWdre5jAsrrIqKillZSu0bk6QcFysb05ba6JJc';

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
    .setLanguage('en');  // Change 'en' to your desired language code

  var mapBlob = map.getBlob();
  var folder = DriveApp.getFolderById(FOLDER_ID);

  // Create file and set sharing settings
  var imageName = 'map_image_' + Utilities.formatDate(new Date(), 'GMT+7', 'dd-MM-yyyy_HH:mm:ss') + '.png';
  var file = folder.createFile(mapBlob);
  file.setName(imageName);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return file.getDownloadUrl();
}

function doPost(e) {
  try {
    var jsonString = e.postData.getDataAsString();
    var data = JSON.parse(jsonString);

    if (data.hasOwnProperty('userID')) {
      var sheetMember = SpreadsheetApp.openById(SPREADSHEET_ID_MEMBER).getSheetByName(SHEET_NAME_MEMBER);

      if (!sheetMember) {
        sheetMember = SpreadsheetApp.openById(SPREADSHEET_ID_MEMBER).insertSheet(SHEET_NAME_MEMBER);
        sheetMember.appendRow(['User ID', 'Name', 'number ID', 'Role ID', 'image Input']);
      }

      sheetMember.appendRow([data.userID, data.nameID, data.numberID, data.roleID, data.imageInput]);
    } else {
      var imageName = data.name + '_' + Utilities.formatDate(new Date(), 'GMT+7', 'dd-MM-yyyy_HH:mm:ss') + '.png';
      var decodedImage = Utilities.base64Decode(data.base64);
      var blob = Utilities.newBlob(decodedImage, 'image/png', imageName);
      var folder = DriveApp.getFolderById(FOLDER_ID);

      // Create file and set sharing settings
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var fileUrl = file.getDownloadUrl();

      // Update spreadsheet
      var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

      if (!sheet) {
        sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(SHEET_NAME);
        sheet.appendRow(['Timestamp', 'Image URL', 'name', 'role', 'job', 'note', 'today', 'time', 'address', 'lat', 'long', 'user']);
      }

      sheet.appendRow([Utilities.formatDate(new Date(), 'GMT+7', 'dd-MM-yyyy HH:mm:ss'), fileUrl, data.name, data.role, data.job, data.note, data.today, data.time, data.address, data.lat, data.long, data.user]);

      // Generate static map image URL
      var mapImageUrl = generateStaticMapImageUrl(data.lat, data.long);

      // Create Line notification message
      var formattedDate = Utilities.formatDate(new Date(data.today), 'GMT+7', 'dd/MM/yyyy');
      var basicMessage = '\n⏰ บันทึกเวลา: ' + data.job + '\n👤 ชื่อ: ' + data.name + '\n💼 เลขที่พนักงาน: ' + data.role + '\n📝 หมายเหตุ: ' + data.note + '\n📅 วันที่: ' + formattedDate + '\n🕒 เวลา: ' + data.time + '\n🏠 ที่อยู่: ' + data.address;

      // Send Line notification
      sendLineNotifyMessage(basicMessage, mapImageUrl);
    }

    return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    console.error(error);
    return ContentService.createTextOutput('Error').setMimeType(ContentService.MimeType.TEXT);
  }
}
