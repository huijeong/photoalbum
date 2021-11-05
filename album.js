var CognitoConfig = {
    regionInfo : 'ap-northeast-2',
    userPoolId : 'ap-northeast-2_kkzJui2so',
    appClientId : 'i01nos3pphphhvs9vatanl9qb',  
    // 위의 userpool에서 생성한 app client id를 입력하시면 됩니다.
    identityPoolId : 'ap-northeast-2:df1d9fae-0cb4-4356-8704-96db9c3ded18'
    // 위의 userpool을 이용해서 생성한 federated identity pool의 id를 입력하시면 됩니다.
};

// 사용할 User Pool의 정보를 저장
var poolData = {
    UserPoolId : CognitoConfig.userPoolId,
    ClientId : CognitoConfig.appClientId
  };

// 입력한 User Pool 정보를 가지고 실제 User Pool에 접근할 수 있는 객체 생성
var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);
var cognitoUser;  // 로그인 성공시 로그인 한 사용자의 정보를 반환받는 변수
var s3;  // s3 객체를 담기 위한 전역변수 선언
var albumBucketName = 'taskalbum'; // 포토앨범으로 사용할 Bucket 이름

// AWS.config에 리전 정보 설정
AWS.config.update({
  region: CognitoConfig.regionInfo
});

AWSCognito.config.region = CognitoConfig.regionInfo;  // AWSCognito 객체에도 리전 정보 설정

//로그인 함수
window.onload = function() { 
    var btnsignin = document.getElementById("signin");
    btnsignin.addEventListener("click", function submitSignin() {
        // 입력 폼에서 ID와 비밀번호를 입력받습니다.
        var user_Name = document.getElementById("signin_username").value;
        var user_Pw = document.getElementById("signin_pwd").value;
    
        // ID와 Password를 정해진 속성명인 Username과 Password에 담습니다.
        var authenticationData = {
        Username : user_Name,
        Password : user_Pw
        };
    
        // 여기에는 ID와 User Pool 정보를 담아 놓습니다.
        var userData = {
        Username : user_Name, // your username here
        Pool : userPool
        };
    
        // 로그인을 위해 Cognito 객체 2개를 준비합니다.
        var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);
        cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
    
        // authenticateUser 함수로 로그인을 시도합니다.
        cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            // credentials를 가져오기 위해 필요한 정보들을 입력합니다.
            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: CognitoConfig.identityPoolId,
            Logins: {}
            });
            AWS.config.credentials.params.Logins['cognito-idp.' + CognitoConfig.regionInfo + '.amazonaws.com/'+ CognitoConfig.userPoolId] = result.getIdToken().getJwtToken();
    
            // get() 함수로 credentials을 획득합니다.
            AWS.config.credentials.get(function(err){
            if (err) {
                alert(err);
            }else{
                // !!! 주의 !!! S3 객체를 만들때는 credentials이 획득된 상태에서 S3를 생성해야합니다.
                // 그렇지 않으면, Missing credentials in config 에러가 발생합니다.
                s3 = new AWS.S3({
                apiVersion: '2006-03-01',
                params: {Bucket: albumBucketName}
                });
    
                // s3객체를 획득하고 앨범 리스트를 출력합니다.
                listAlbums();
            }
            });
        },
        onFailure: function(err) {
            alert(err);
        }
        });
    }, false);
}

//앨범 목록 표시 함수
function listAlbums() {
    s3.listObjects({ Delimiter: "/" }, function(err, data) {
      if (err) {
        return alert("There was an error listing your albums: " + err.message);
      } else {
        var albums = data.CommonPrefixes.map(function(commonPrefix) {
          var prefix = commonPrefix.Prefix;
          var albumName = decodeURIComponent(prefix.replace("/", ""));
          return getHtml([
            "<li>",
            "<span onclick=\"deleteAlbum('" + albumName + "')\">X</span>",
            "<span onclick=\"viewAlbum('" + albumName + "')\">",
            albumName,
            "</span>",
            "</li>"
          ]);
        });
        var message = albums.length
          ? getHtml([
              "<p>Click on an album name to view it.</p>",
              "<p>Click on the X to delete the album.</p>"
            ])
          : "<p>You do not have any albums. Please Create album.";
        var htmlTemplate = [
          "<h2>Albums</h2>",
          message,
          "<ul>",
          getHtml(albums),
          "</ul>",
          "<button onclick=\"createAlbum(prompt('Enter Album Name:'))\">",
          "Create New Album",
          "</button>"
        ];
        document.getElementById("app").innerHTML = getHtml(htmlTemplate);
      }
    });
}

//앨범 생성 함수
function createAlbum(albumName) {
    albumName = albumName.trim();
    if (!albumName) {
      return alert("Album names must contain at least one non-space character.");
    }
    if (albumName.indexOf("/") !== -1) {
      return alert("Album names cannot contain slashes.");
    }
    var albumKey = encodeURIComponent(albumName);
    s3.headObject({ Key: albumKey }, function(err, data) {
      if (!err) {
        return alert("Album already exists.");
      }
      if (err.code !== "NotFound") {
        return alert("There was an error creating your album: " + err.message);
      }
      s3.putObject({ Key: albumKey }, function(err, data) {
        if (err) {
          return alert("There was an error creating your album: " + err.message);
        }
        alert("Successfully created album.");
        viewAlbum(albumName);
      });
    });
}

//앨범 보기
function viewAlbum(albumName) {
    var albumPhotosKey = encodeURIComponent(albumName) + "/";
    s3.listObjects({ Prefix: albumPhotosKey }, function(err, data) {
      if (err) {
        return alert("There was an error viewing your album: " + err.message);
      }
      // 'this' references the AWS.Response instance that represents the response
      var href = this.request.httpRequest.endpoint.href;
      var bucketUrl = href + albumBucketName + "/";
  
      var photos = data.Contents.map(function(photo) {
        var photoKey = photo.Key;
        var photoUrl = bucketUrl + encodeURIComponent(photoKey);
        return getHtml([
          "<span>",
          "<div>",
          '<img style="width:128px;height:128px;" src="' + photoUrl + '"/>',
          "</div>",
          "<div>",
          "<span onclick=\"deletePhoto('" +
            albumName +
            "','" +
            photoKey +
            "')\">",
          "X",
          "</span>",
          "<span>",
          photoKey.replace(albumPhotosKey, ""),
          "</span>",
          "</div>",
          "</span>"
        ]);
      });
      var message = photos.length
        ? "<p>Click on the X to delete the photo</p>"
        : "<p>You do not have any photos in this album. Please add photos.</p>";
      var htmlTemplate = [
        "<h2>",
        "Album: " + albumName,
        "</h2>",
        message,
        "<div>",
        getHtml(photos),
        "</div>",
        '<input id="photoupload" type="file" accept="image/*">',
        '<button id="addphoto" onclick="addPhoto(\'' + albumName + "')\">",
        "Add Photo",
        "</button>",
        '<button onclick="listAlbums()">',
        "Back To Albums",
        "</button>"
      ];
      document.getElementById("app").innerHTML = getHtml(htmlTemplate);
    });
}

//앨범에 사진 추가
function addPhoto(albumName) {
    var files = document.getElementById("photoupload").files;
    if (!files.length) {
      return alert("Please choose a file to upload first.");
    }
    var file = files[0];
    var fileName = file.name;
    var albumPhotosKey = encodeURIComponent(albumName) + "/";
  
    var photoKey = albumPhotosKey + fileName;
  
    // Use S3 ManagedUpload class as it supports multipart uploads
    var upload = new AWS.S3.ManagedUpload({
      params: {
        Bucket: albumBucketName,
        Key: photoKey,
        Body: file
      }
    });
  
    var promise = upload.promise();
  
    promise.then(
      function(data) {
        alert("Successfully uploaded photo.");
        viewAlbum(albumName);
      },
      function(err) {
        return alert("There was an error uploading your photo: ", err.message);
      }
    );
}

//사진 삭제
function deletePhoto(albumName, photoKey) {
    s3.deleteObject({ Key: photoKey }, function(err, data) {
      if (err) {
        return alert("There was an error deleting your photo: ", err.message);
      }
      alert("Successfully deleted photo.");
      viewAlbum(albumName);
    });
}

//앨범 삭제
function deleteAlbum(albumName) {
    var albumKey = encodeURIComponent(albumName) + "/";
    s3.listObjects({ Prefix: albumKey }, function(err, data) {
      if (err) {
        return alert("There was an error deleting your album: ", err.message);
      }
      var objects = data.Contents.map(function(object) {
        return { Key: object.Key };
      });
      s3.deleteObjects(
        {
          Delete: { Objects: objects, Quiet: true }
        },
        function(err, data) {
          if (err) {
            return alert("There was an error deleting your album: ", err.message);
          }
          alert("Successfully deleted album.");
          listAlbums();
        }
      );
    });
}
