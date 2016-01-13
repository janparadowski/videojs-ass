/*! videojs-ass
 * Copyright (c) 2014 Sunny Li
 * Licensed under the Apache-2.0 license. */

(function (videojs, libjass) {
  'use strict';

  var vjs_ass = function (options) {
    var overlay = document.createElement('div'),
      AssButton = null,
      VjsButton = null,
      AssButtonInstance = null,
      clock = null,
      clockRate = options.rate || 1,
      delay = options.delay || 0,
      player = this,
      renderer = null,
      subsRequest = new XMLHttpRequest();

    if (!options.src) {
      return;
    }

    overlay.className = 'vjs-ass';
    player.el().insertBefore(overlay, player.el().firstChild.nextSibling);

    function getCurrentTime() {
      return player.currentTime() - delay;
    }

    clock = new libjass.renderers.AutoClock(getCurrentTime, 100);

    player.on('play', function () {
      clock.play();
    });

    player.on('pause', function () {
      clock.pause();
    });

    player.on('seeking', function () {
      clock.seeking();
    });

    function updateClockRate() {
      clock.setRate(player.playbackRate() * clockRate);
    }
    
    updateClockRate();
    player.on('ratechange', updateClockRate);

    function updateDisplayArea() {
      if (player.isFullscreen()) {
        overlay.style.height = screen.height + 'px';
        renderer.resize(screen.width, screen.height);
      } else {
        overlay.style.height = player.height() + 'px';
        renderer.resize(player.width(), player.height());
      }
    }

    player.on('resize', updateDisplayArea);
    player.on('fullscreenchange', updateDisplayArea);

    player.on('dispose', function () {
      clock.disable();
    });

    var dataURIoption = function (subtitles) {
      var assPromise = libjass.ASS.fromString(
        subtitles,
        libjass.Format.ASS
      );

      assPromise.then(
        function (ass) {
          var rendererSettings = new libjass.renderers.RendererSettings();
          if (options.hasOwnProperty('enableSvg')) {
            rendererSettings.enableSvg = options.enableSvg;
          }

          renderer = new libjass.renderers.WebRenderer(ass, clock, overlay, rendererSettings);
          updateDisplayArea();

          // accessible through internal videojs plugins property
          options.internal = {
            clock: clock,
            renderer: renderer
          };
        }
      );
    }

    if (options.src[0].substr(0,4) === "data") {
       var dataUri = options.src[0],
           offSet = dataUri.indexOf("base64,");
       if (offSet > -1) { 
         dataURIoption(atob(dataUri.substr(7+offSet)));
       } else {
         // TODO exception here!!!
       }
    } else {
      subsRequest.open("GET", options.src, true);
      subsRequest.addEventListener("load", function() {
        dataURIoption(subsRequest.responseText);
      }, false);

      subsRequest.send(null);
    }
    function createAssButton() {
      var props = {
        className: 'vjs-ass-button vjs-control',
        role: 'button',
        'aria-label': 'ASS subtitle toggle',
        'aria-live': 'polite',
        tabIndex: 0
      };
      return videojs.Component.prototype.createEl('div', props);
    }

    // Visibility Toggle Button
    if (!options.hasOwnProperty('button') || options.button) {

      VjsButton = videojs.getComponent('Button');
      AssButton = videojs.extend(VjsButton, {
        constructor: function (player, options) {
          options.name = options.name || 'assToggleButton';
          VjsButton.call(this, player, options);

          this.addClass('vjs-ass-button');

          this.on('click', this.onClick);
        },
        onClick: function () {
          if (!this.hasClass('inactive')) {
            this.addClass('inactive');
            overlay.style.display = "none";
          } else {
            this.removeClass('inactive');
            overlay.style.display = "";
          }
        }
      });

      player.ready(function () {
        AssButtonInstance = new AssButton(player, options);
        player.controlBar.addChild(AssButtonInstance);
        player.controlBar.el().insertBefore(
          AssButtonInstance.el(),
          player.controlBar.getChild('customControlSpacer').el()
        );
      });

    }
  };

  videojs.plugin('ass', vjs_ass);
}(window.videojs, window.libjass));
