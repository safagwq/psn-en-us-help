// ==UserScript==
// @name         psn美服助手
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  psn美服助手 , 可以把相同id的美区游戏信息高亮显示为港服信息
// @author       safa
// @match        https://store.playstation.com/en-us/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';


    var GameDatabase=null
    var translationQueue = []

    initGameDatabase()
    start()

    function start(){
        initStyle()

        setInterval(()=>{
            updateTranslationQueue()
            startTranslationGameInfo()
            updateView()
        },2000)
    }

    function updateView(){
        getGameList().forEach((gameId)=>{
            if(!GameDatabase.allGame[gameId] || GameDatabase.allGame[gameId]=='error'){
                return
            }

            var a=document.querySelector(`a[href^="/en-us/product/${gameId}"]`)
            if(!a.querySelector('.safa-translation')){
                a.querySelector('.grid-cell__thumbnail').appendChild(getSafaTranslationElement(gameId))
            }
        })
    }

    function initGameDatabase(){
        if(!localStorage.GameDatabase){

            GameDatabase={
                allGame : {},
                queue : [],
            }

            cacheGameDatabase()
        }

        GameDatabase = JSON.parse(localStorage.GameDatabase)
    }

    function initStyle(){
        var style=document.createElement('style')
        style.innerHTML=`
            .ember-view:hover{z-index:3;  }
            .grid-cell__thumbnail{ position:relative;  }

            .safa-translation{ position:absolute;  height:100%;  width:100%;  top:0;  left:0;  padding:5px;  background:rgba(0,0,255,0.7);  font-size:12px;  }
            .safa-translation-type{}
            .safa-translation-lang{}
            .safa-translation-name{ display:block;  }
            .safa-translation-description{ position:absolute;  top:50%;  width:400px;  height:300px;  left:50%;  margin-left:-200px;  padding:10px;  background:#666;  border-radius:10px;  color:#fff;  overflow:auto;  display:none;  }

            .safa-translation:hover{ z-index:3;  }
            .safa-translation:hover>.safa-translation-description{ display:block;  }
        `
        document.head.append(style)
    }

    function getSafaTranslationElement(gameId){
        var gameInfo = GameDatabase.allGame[gameId]

        var div=document.createElement('div')
        div.className='safa-translation'
        div.innerHTML=`
            <span class='safa-translation-type'>${gameInfo.type}</span>
            <span class='safa-translation-lang'>${gameInfo.lang}</span>
            <span class='safa-translation-name'>${gameInfo.name}</span>
            <div class='safa-translation-description'>${gameInfo.description}</div>
        `
        return div
    }

    function updateTranslationQueue(){

        var newGames = getGameList().filter((gameId)=>{
            return !GameDatabase.allGame[gameId] && !GameDatabase.queue.includes(gameId)
        })

        GameDatabase.queue.push(...newGames)
    }

    function startTranslationGameInfo(){
        for(var i=translationQueue.length; i<5 ;i++){
            var gameId = GameDatabase.queue.shift()
            if(!gameId){
                continue
            }
            translationQueue.push(gameId)
            translationGameInfo(gameId)
        }
    }

    function translationGameInfo(gameId){
        if(!gameId)return

        getHKGameInfo(gameId)
        .then((data)=>{
            translationGameInfoEnd(gameId , data)
            console.log(GameDatabase)
        })
        .catch(()=>{
            translationGameInfoEnd(gameId , 'error')
        })
    }

    function translationGameInfoEnd(gameId , data){
        GameDatabase.allGame[gameId] = formatData(data)
        GameDatabase.queue.splice( GameDatabase.queue.indexOf(gameId) )
        translationQueue.splice( translationQueue.indexOf(gameId) )

        cacheGameDatabase()
    }

    function formatData(srcData){
        if(srcData=='error'){
            return 'error'
        }

        var gameTrueId = srcData.data.relationships.children.data[0].id
        var gameInfo = srcData.included.find(gameInfo=>gameInfo.id==gameTrueId).attributes
        return {
            gameId : gameTrueId, 
            type : gameInfo['game-content-type'],
            name : gameInfo['name'],
            description : gameInfo['long-description'],
            lang : gameInfo['skus'][0]['name'],
        }
    }

    function getHKGameInfo(gameId){
        return fetch('https://store.playstation.com/valkyrie-api/ch/HK/999/resolve/'+gameId).then((response)=>response.json())
    }

    getGameList()

    function getGameList(){
        var gameList=Array.from(document.querySelectorAll('a[href^="/en-us/product/UP"]')).map(function(a){
            return getGameIdByUrl(a.href)
            // {
            //     element : a,
            //     link : a.href,
            //     id : 
            // }
        })

        return Array.from(new Set(gameList))
    }

    function getGameIdByUrl(url){
        var urlMatch = new URL(url).pathname.match(/\/UP[\S\s]+/)

        if(urlMatch){
            return urlMatch[0].slice(1)
        }

        return null
    }

    function cacheGameDatabase(){
        localStorage.GameDatabase = JSON.stringify(GameDatabase)
    }

})();