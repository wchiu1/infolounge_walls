var artworkInfo = '',
    slides = '',
    variable = '',
    clss = '',
    playing = false,
    tombstoneTimeout = '',
    introTimeout = '',
    zoomerTemplate = _.template($('#zoomer').html()),
    lastSlideId = 'image-view-1',
    screenId = 'development';
    
screenId=window.location.hash?window.location.hash.substr(1):screenId; // use for logging which screen is in use

mejs.MediaFeatures.hasTouch = false;

Zoomer.slideHasVideo = false;
Zoomer.skipTombstone = false;

function showTombstone() {
    if (Zoomer.skipTombstone) { return; }
    clearTimeout(tombstoneTimeout);
    if (Zoomer.slideHasVideo === true) {
        $('.tombstone').addClass('on-video-slide');
    } else {
        $('.tombstone').removeClass('on-video-slide');
    }
    $('.tombstone').stop(true, true).delay(250).fadeIn(150);
    $('.status').stop(true, true).delay(250).fadeIn(150);
    tombstoneTimeout = setTimeout(function() {
        $('.tombstone').stop(true, true).fadeOut(250);
        $('.status').stop(true, true).fadeOut(250);
    }, 5000);
}

function hideIntro() {
    clearTimeout(introTimeout);
    //$('.intro').stop(true, true).fadeOut(500);
    introTimeout = setTimeout(function() {
        //$('.intro').show();
        $.colorbox.close();
        mySwipe.slide(2, 0);
        _gaq.push(['_trackEvent',screenId,'Wakeup']);
    }, 90000);
}

function swapInfo(index, slide) {
    var $el = $(slide);
    $('.tombstone').html($el.children('.meta').html());
    $('#info').html($el.children('.slide-article').html());
    if ((index > 0) && (index < ($('.swipe-wrap > div').length - 1))) {
        index = index-1;
        if (index < 1) { index = ($('.swipe-wrap > div').length - 2); }
        $('.status .status-pointer .current').html(index);
        $('.status .status-bar').css('width', ((index/($('.swipe-wrap > div').length - 2)) * 100) + '%');
    }
    if ($('#info').children()[0].innerHTML) {
        $('.info-link').show(500);
    } else {
        $('.info-link').hide(500);
    }
    if ($el.children('.meta').html()) {
        $('.tombstone').fadeIn(150);
        Zoomer.skipTombstone = false;
    } else {
        $('.tombstone').fadeOut(150);
        Zoomer.skipTombstone = true;
    }
}

var cbox = undefined;
function showInfo() {
    _gaq.push(['_trackEvent',screenId,'Info']);
    for (var i = 0; i < $('.video-container video').length; i++) {
        $('.video-container video')[i].pause();
    }
    cbox=$.colorbox({
        transition: 'none',
        width: '60%',
        initialWidth: '60%',
        fadeOut: 250,
        opacity: 0.8,
        inline: true,
        href: '#info',
        onComplete: function() {
            $('#cboxLoadedContent article').scroller({
                customClass: 'walker-scroller',
                trackMargin: 8,
                handleSize: 60
            });
            if (!$('#cboxLoadedContent article').hasClass('scroller-active')) {
                $('#cboxLoadedContent .info-wrapper').addClass('locked');
            }
        },
        onClosed: function() {
            $('.locked').removeClass('locked');
        }
    });
}

lastSlideStack = [];

function slideInit() {
    window.mySwipe = new Swipe(document.getElementById('slider'), {
        callback: function(index, slide) {
            if (Zoomer.zoomers[slide.id]) {
                Zoomer.zoomers[slide.id].map.touchZoom._zooming=false;
            }
            Zoomer.skipTombstone = false;
            Zoomer.advancingSlide = false;
            if ($(slide).hasClass('video')) {
                Zoomer.slideHasVideo = true;
            } else {
                Zoomer.slideHasVideo = false;
            }
            showTombstone();
            swapInfo(index, slide);
            if (Zoomer.zoomers[lastSlideId]) {
                lastSlideStack.push(lastSlideId);
                setTimeout(function() {
                    var lastId = lastSlideStack.pop();
                    if (lastId.indexOf('_dummy') < 0) {
                        Zoomer.zoomers[lastId].map.centerImageAtExtents();
                        Zoomer.zoomers[lastId].map.touchZoom._zooming=false;
                    }
                }, 500);
            }
            for (var i = 0; i < $('.video-container video').length; i++) {
                $('.video-container video')[i].pause();
                if ($('.video-container video')[i].currentTime > 0) {
                    var skipTime = Math.floor($('.video-container video')[i].currentTime);
                    skipTime = skipTime.toString();
                    _gaq.push(['_trackEvent',screenId,'VideoSkipped',skipTime]);
                    $('.video-container video')[i].setCurrentTime(0);
                }
            }
            var videoId = '#' + lastSlideId;
            if ($(videoId).hasClass('video')) {
                $el = $(videoId);
                $el.find('.mejs-poster').css('display', 'block');
                $el.find('.mejs-overlay-button').css('display', 'block');
                $el.find('.mejs-overlay-play').css('display', 'block');
            }
            lastSlideId = slide.id; // record this so we know what we're leaving next time
        }
    });
    lastSlideId = window.mySwipe.slides[window.mySwipe.index].id;
    swapInfo(1, '.slide-index-0');
    setTimeout(initDone, 500);
}

function initDone() {
    var z = Zoomer.zoomers[window.mySwipe.slides[0].id];
    z.map.options.touchZoom = false;
    z.map.options.dragging = false;
    z.map.options.doubleClickZoom = false;
    z = Zoomer.zoomers[window.mySwipe.slides[window.mySwipe.slides.length-1].id];
    z.map.options.touchZoom = false;
    z.map.options.dragging = false;
    z.map.options.doubleClickZoom = false;
    $('.video-container video').on('playing', function() {
        clearTimeout(introTimeout);
        _gaq.push(['_trackEvent',screenId,'VideoPlay']);
    }).on('pause',function() {
        hideIntro();
    }).on('ended',function() {
        hideIntro();
        _gaq.push(['_trackEvent',screenId,'VideoFinished']);
    });
    mySwipe.next();
}

$.getJSON('javascripts/garden.json', function(data) {
    slides = data.slides;
    for (var variable in slides) {
        if (slides[variable]) {
            slides[variable].zoomer_class = 'slide-index-' + variable;
            slides[variable].id = 'video' + variable;
            slides[variable].player_id = 'player' + variable;
            $('.swipe-wrap').append(zoomerTemplate(slides[variable]));
            if (slides[variable].type === 'zoomer') {
                Zoomer.zoom_image_by_class({'container': slides[variable].zoomer_class, 'tileURL': slides[variable].zoomer_url, 'imageWidth': slides[variable].zoomer_width, 'imageHeight': slides[variable].zoomer_height});
            }
        }
    }
    $('.video-container video').mediaelementplayer({
        videoWidth: 1920,
        videoHeight: 1080,
        startVolume: 1,
        features: ['progress'],
        alwaysShowControls: true
    });
    $('.status .status-pointer .total').html($('.swipe-wrap > div').length.toString());
    setTimeout(slideInit, 500); // don't initialize swipe until the zoomers are loaded
});

$(document).ready(function() {

    showTombstone();

    if (Modernizr.touch) {
        $(document).on('touchstart', function() {
            showTombstone();
            hideIntro();
        });
        $('body').attr('oncontextmenu', 'return false');
    } else {
        $(document).on('mousedown', function() {
            showTombstone();
            hideIntro();
        });
    }

    $('nav a').on('click', function(event) {
        event.stopPropagation();
    });

    $('#colorbox').on('click', function(event) {
        event.stopPropagation();
    });

    $('.info-link').on('touchend', function(event) {
        event.stopPropagation();
        event.preventDefault();
        showInfo();
    });
    
    $('#cboxOverlay').on('touchend', cboxTouchEnd);
    $('#colorbox').on('touchend', cboxTouchEnd);

});

function cboxTouchEnd(event) {
    if (event.target.nodeName == 'P') { return; }
    event.stopPropagation();
    event.preventDefault();
    cbox.colorbox.close();
};

// Change straight quotes to curly and double hyphens to em-dashes.
function smarten(a) {
  if (!a) { return a; }
  a = a.replace(/(^|[-\u2014\s(\["])'/g, "$1\u2018");       // opening singles
  a = a.replace(/'/g, "\u2019");                            // closing singles & apostrophes
  a = a.replace(/(^|[-\u2014/\[(\u2018\s])"/g, "$1\u201c"); // opening doubles
  a = a.replace(/"/g, "\u201d");                            // closing doubles
  a = a.replace(/--/g, "\u2014");                           // em-dashes
  return a
};

