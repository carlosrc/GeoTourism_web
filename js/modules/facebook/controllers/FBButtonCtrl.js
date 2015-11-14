'use strict';

define([
    '../module'
],function(module){
    module.controller('FBButtonCtrl',['Config','Facebook','AuthFBService','AuthFBStorageService',
        function(Config,Facebook,AuthFBService,AuthFBStorageService){

        this.isAuthFB = function(){
            return AuthFBService.isAuthFB;
        };
        this.isFBReady = function(){
            return Facebook.isReady();
        };
        this.logInFB = function(){
            Facebook.login(function(response){
                var accessToken = response.authResponse.accessToken,
                    userID = response.authResponse.userID;
                if (angular.isDefined(accessToken) && angular.isDefined(userID)){
                    AuthFBStorageService.handleLogIn(accessToken,userID);
                }
            },{scope:Config.FACEBOOK_PERMISSIONS});
        };
        this.logOutFB = function(){
            Facebook.logout(function(response){
                AuthFBStorageService.handleLogOut();
            });
        };
    }]);
});