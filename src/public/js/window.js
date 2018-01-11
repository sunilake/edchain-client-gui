
const { ipcRenderer, remote } = require('electron');

const coursesActions = require("../../shared/actions/courses");
const ipfsActions = require("../../shared/actions/ipfs");

const configureStore = require('../../shared/store/configureStore');

// get the global.state from the main process
const initialState = remote.getGlobal('state');

// create store
const store = configureStore(initialState, 'renderer');


// these ping main process
var __actions = {
    // should the main.store track the windows aswell?
    openCourseLink: function(url){
        ipcRenderer.send('createAndShowChildWindow', url);
    },
    showSettings: function(){
        ipcRenderer.send('openSettings');
    },
    start: function(){
        store.dispatch(ipfsActions.start());
    },
    stop: function(){
       store.dispatch(ipfsActions.stop());
    },
    addPin: function(id, hash){
        store.dispatch(ipfsActions.addPin(id, hash));
    },
    removePin: function(id, hash){
        store.dispatch(ipfsActions.removePin(id, hash));
    },

};

var __ui = {
    setIPFSStatusButton: function (isOnline){
        if(isOnline){
          $('#ipfs-icon-ref').removeClass('btn-outline-danger').addClass('btn-success');
          $('#img-ipfs-icon').prop("alt",'IPFS Online');
      
        }
        else{
            $('#ipfs-icon-ref').removeClass('btn-success').addClass('btn-outline-danger');
        }
    }, 
    createHomePageCard: function(image, title, indexURL, courseDirectoryHash, courseId, action){
        $(".loader").hide();
        action = action || "...";
        var rendered = Mustache.render(
            $("#course-card-template").html(),
            { image, title, indexURL, courseDirectoryHash, courseId, action }
        );
        $('#course-cards').append(rendered);
        
    },
    clearCard: function(){
          $('#course-cards').empty();
    },
    showPeerCount: function(peerCount){
         $('#swarm-count').html(peerCount);
    },
    setPinStatus: function(id, isPinned){
        var 
            action = (isPinned ? "unpin" : "pin"),
            $courseCard = $(`#${id}`),
            $actionLink = $courseCard.find("a.pin-course-link");
        
        $actionLink.data("action", action);
        $actionLink.text(action);
        
        $courseCard.find(".pin-status").text( ( isPinned ? "Pinned" : "Un-Pinned" ) );
        $actionLink.removeClass( ( isPinned ? "unpinImage" : "pinImage") );
        $actionLink.addClass( ( isPinned ? "pinImage" : "unpinImage") );
    },
    search: function(...terms){
        console.log("setsearch",true);
        store.dispatch(
            {
            type:'setSearch', 
            payload: true
        });
        __ui.clearCard();
        store.dispatch(coursesActions.getSearchData()); 

    }

};

// this function updates page based on state
// this can be broken into several functions triggered by applyState
var applyState = function applyState(state){
    __ui.setIPFSStatusButton(state.ipfs.isOnline);
    __ui.showPeerCount(state.ipfs.peers);
//    console.log("applystate",state);

    // applyCourses(state.courses.items);
   
  
 //       console.log("applycourses",state.courses.items);
    console.log("count1",Object.keys(state.courses.items).length );

    if(Object.keys(state.courses.items).length === store.getState().courses.resultCount){
     console.log("applystate",state.courses.items);
     applyCourses(state.courses.items);
    }
   
};


var callback = function(value){

       console.log("setsearch2",value);
        store.dispatch(
            {
                type:'setSearch', 
                payload: value
            });
       
    
};

var setIsDisplayed= function (id,value){
    store.dispatch({ 
                "type" : "setIsDisplayed", 
                "payload" : {
                    "id": id, 
                    "value": value
                }
            });
    
};


var applyCourses = function(items){
    courseKeys = Object.keys(items);
    console.log("coursekeys",courseKeys);
    let itemProcessed=0;
    let cLen = store.getState().courses.resultCount;
    let displayedCourses = [];

    courseKeys.forEach(function(key){
       
        let course = items[key];

        let $courseCard = $(`#${course.id}`);
        let meta = course.META;

        console.log("courseHomePage",meta);
  //      console.log("META",course.META);
        let isReady = meta.urls.image && meta.urls.index && meta.hashes.courseDirectoryHash && course.course_title;
      //  let isSearch = store.getState().isSearch;
        let isSearch = store.getState().ipfs.isSearch;
        console.log("isSearch",isSearch,"isReady",isReady);
       
      
        if(isReady){
            console.log("len",itemProcessed,courseKeys.length,cLen);
            itemProcessed = itemProcessed+1;
            console.log("createcard");

      //      console.log("isSearch2",isSearch);
            console.log("createhomepagecard",meta.urls);
           if(!course.isDisplayed){
             setIsDisplayed(course.id,true);
             displayedCourses.push(course.id);
               console.log("displayedCourses", displayedCourses);
            __ui.createHomePageCard(
                meta.urls.image, course.course_title, meta.urls.index, 
                meta.hashes.courseDirectoryHash, course.id
            );
           
            }
        } else if($courseCard.length) {
         __ui.setPinStatus(course.id, course.META.isPinned);
       }
    
       if(itemProcessed === cLen){
        callback(false);
        console.log("ops complete",false);
       }
    });

   
    };

$(document).ready(function() {

    $('#course-cards').on("click", '.pin-course-link', function(event){
        event.preventDefault();
        var { action, id, hash } = $(this).data();
        __actions[(action === "unpin" ? "removePin" : "addPin")](id, hash);
    });

    $("#ipfs-icon-ref").on("click", function(event){
        event.preventDefault();
        __actions.showSettings();
    });

    $("#search-btn").on("click",function(event){
        event.preventDefault();
        __ui.search();
    });

    $('#course-cards').on("click", ".card a.course-link", function(event){
        event.preventDefault();
        var url = $(this).data("url");
        __actions.openCourseLink(url);
    });

    applyState(store.getState());
 
    store.subscribe(function(){
        // executed when something could have changed the state
          applyState(store.getState());
       
    });
});
