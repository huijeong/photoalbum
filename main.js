var CognitoConfig = {
    regionInfo : 'ap-northeast-2',
    userPoolId : 'ap-northeast-2_kkzJui2so',
    appClientId : 'i01nos3pphphhvs9vatanl9qb',  
    identityPoolId : 'ap-northeast-2:df1d9fae-0cb4-4356-8704-96db9c3ded18'
};

// 사용할 User Pool의 정보를 저장
var poolData = {
    UserPoolId : CognitoConfig.userPoolId,
    ClientId : CognitoConfig.appClientId
};

// 입력한 User Pool 정보를 가지고 실제 User Pool에 접근할 수 있는 객체 생성
var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);
var cognitoUser;  // 로그인 성공시 로그인 한 사용자의 정보 저장할 변수 선언

// AWS.config에 리전 정보 설정
AWS.config.update({
  region: CognitoConfig.regionInfo
});

AWSCognito.config.region = CognitoConfig.regionInfo;  // AWSCognito 객체에도 리전 정보 설정


//회원가입 함수
window.onload = function() { 
    var btn = document.getElementById("signUp");
    btn.addEventListener("click", function submitSignUp() {
        // 가입할 때 사용자가 입력한 정보들을 저장할 배열입니다.
        var attributeList = [];
    
        // 입력 폼에서 입력된 값을 받아오는 부분입니다. 일반적인 javascript입니다.
        var user_Email = document.getElementById("signup_username").value;
        var user_Pw = document.getElementById("signup_pwd").value;
        console.log('user data : ', user_Email, ', ', user_Pw);
    
        // 이 변수가 사용자가 입력한 정보 중 하나를 입력하는 변수입니다.
        var dataEmail = {
        Name: 'email',
        Value : user_Email
        };
    
        // Attribute를 AWS Cognito가 알아들을 수 있는 객체로 만듭니다.
        var attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);
    
        // 방금 위에서 만든 Attribute 객체를 Attribute List에 추가시킵니다.
        // 이렇게 배열에 다 추가시키고 한번에 Cognito에 넘길겁니다.
        attributeList.push(attributeEmail);
    
        // 전역변수로 만들어 놓은 User Pool 객체에서는 signup 함수를 제공합니다.
        // 인자는 User name(ID 인것 같네요.), Password, Attribute List, null, 처리 결과가 오면 수행 될 callback 함수 입니다.
        userPool.signUp(user_Email,user_Pw, attributeList, null, function(err, result) {
            if(err) {
                // error가 발생하면 여기로 빠집니다.
                alert(err);
                return;
            }
    
        // 가입이 성공하면 result에 가입된 User의 정보가 되돌아 옵니다.
        // 인증 함수에서 사용해야하기에 위에서 만든 전역변수인 cognitoUser에 넣어놓습니다.
        cognitoUser = result.user;
        console.log('user name is '+cognitoUser.getUsername());
        });
    }, false);


    //인증 함수

    var btns = document.getElementById("verify");
    btns.addEventListener("click", function submitActivateCode() {

        var user_activatecode = document.getElementById("activate_code").value;
    
        // cognitoUser는 가입함수에서 가입 성공 후 되돌아온 사용자 정보가 담겨있습니다.
        // confirmRegistration함수를 수행하면 AWS Cognito로 인증 요청
        cognitoUser.confirmRegistration(user_activatecode, true, function(err, result){
        if(err) {
            alert(err);
            return;
        }
        // 인증이 성공하면 SUCCESS 문자가 되돌아 옵니다.
        console.log('call result : ' + result);
        });
    }, false);
}





  