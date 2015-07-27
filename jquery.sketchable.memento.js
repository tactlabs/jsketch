/*!
 * Memento plugin for jQuery sketchable | v1.1 | Luis A. Leiva | MIT license
 */
/**
 * @name $
 * @class
 * See <a href="http://jquery.com/">the jQuery library</a> for full details.
 * This just documents the method that is added to jQuery by this plugin.
 */
/**
 * @name $.fn
 * @class
 * See <a href="http://jquery.com/">the jQuery library</a> for full details.
 * This just documents the method that is added to jQuery by this plugin.
 */
;(function($) {

  /**
   * @name MementoCanvas
   * @class
   * @return Object
   * @example
   * var mc = new MementoCanvas( $('canvas-selector') );
   */
  var MementoCanvas = function($canvas) {

    // Private stuff //////////////////////////////////////////////////////////
    var stack = [];
    var stpos = -1;
    var self  = this;

    function prev() {
      if (stpos > 0) {
        stpos--;
        var snapshot = new Image();
        snapshot.src = stack[stpos].image;
        snapshot.onload = function() {
          restore(this);
        };
      }
    };

    function next() {
      if (stpos < stack.length - 1) {
        stpos++;
        var snapshot = new Image();
        snapshot.src = stack[stpos].image;
        snapshot.onload = function() {
          restore(this);
        };
      }
    };

    function restore(snapshot) {
      // Manipulate canvas via jQuery sketchable API.
      // This way, we don't lose default drawing settings et al.
      $canvas.sketchable('handler', function(elem, data){
        data.sketch.clear();
        data.sketch.graphics.drawImage(snapshot, 0,0);
      });
    };

    // Key event manager.
    // Undo: "Ctrl + Z"
    // Redo: "Ctrl + Y" or "Ctrl + Shift + Z"
    // TODO: decouple shortcut definition, perhaps via jquery.hotkeys plugin.
    function keyManager(e) {
      if (e.ctrlKey) {
        switch (e.which) {
          case 26: // Z
            if (e.shiftKey) self.redo();
            else self.undo();
            break;
          case 25: // Y
            self.redo();
            break;
          default:
            break;
        }
      }
    };

    // Public stuff ///////////////////////////////////////////////////////////

    /**
     * Goes back to the last saved state, if available.
     * @name undo
     * @memberOf MementoCanvas
     */
    this.undo = function() {
      prev();
      $canvas.sketchable('handler', function(elem, data) {
        if (stack[stpos])
          data.strokes = stack[stpos].strokes.slice();
      });
    };
    /**
     * Goes forward to the last saved state, if available.
     * @name redo
     * @memberOf MementoCanvas
     */
    this.redo = function() {
      next();
      $canvas.sketchable('handler', function(elem, data) {
        if (stack[stpos])
          data.strokes = stack[stpos].strokes.slice();
      });
    };
    /**
     * Resets stack.
     * @name reset
     * @memberOf MementoCanvas
     */
    this.reset = function() {
      stack = [];
      stpos = -1;
    };
    /**
     * Save state.
     * @name save
     * @memberOf MementoCanvas
     */
    this.save = function() {
      stpos++;
      if (stpos < stack.length) stack.length = stpos;
      $canvas.sketchable('handler', function(elem, data) {
        stack.push({ image: elem[0].toDataURL(), strokes: data.strokes.slice() });
      });
    };
    /**
     * Init instance.
     * @name init
     * @memberOf MementoCanvas
     */
    this.init = function() {
      // Prevent subsequent instances to re-attach this event to the document.
      $(document).off("keypress", keyManager);
      $(document).on("keypress", keyManager);
    };
    /**
     * Destroy instance.
     * @name destroy
     * @memberOf MementoCanvas
     */
    this.destroy = function() {
      $(document).off("keypress", keyManager);
      this.reset();
    };

  };

  // Bind plugin extension ////////////////////////////////////////////////////

  var plugin = $.fn.sketchable;
  var availMethods = plugin('methods');

  function configure(elem, opts) {
    var self = elem, options = $.extend(true, plugin.defaults, opts);
    // Actually this plugin is singleton, so exit early.
    if (!options.interactive) return opts;

    var mc = new MementoCanvas(elem);
    var callbacks = {
      init: function(elem, data) {
        data.memento = mc;
        data.memento.save();
        data.memento.init();
      },
      clear: function(elem, data) {
        data.memento.save();
      },
      mouseup: function(elem, data, e) {
        data.memento.save();
      },
      destroy: function(elem, data) {
        data.memento.destroy();
      }
    };

    // A helper function to override user-defined event listeners.
    function override(ev) {
      if (options && options.events && typeof options.events[ev] === 'function') {
        var fn = options.events[ev];
        options.events[ev] = function() {
          // Exec original function first, then exec our callback.
          var args = Array.prototype.slice.call(arguments, 0);
          fn.apply(self, args);
          callbacks[ev].apply(self, args);
        }
      } else {
        plugin.defaults.events[ev] = callbacks[ev];
      }
    };

    // Avoid re-attaching the same callbacks more than once.
    if (!plugin.isMementoReady) {
      // Event order matters.
      var events = 'init mouseup clear destroy'.split(" ");
      for (var i = 0; i < events.length; i++) {
        override(events[i]);
      }
      plugin.isMementoReady = true;
    }

    // Expose public API for jquery.sketchable plugin.
    $.extend(availMethods, {
      undo: function() {
        mc.undo();
      },
      redo: function() {
        mc.redo();
      }
    });

    return plugin.defaults;
  };

  /**
   * Creates a new memento-capable jQuery.sketchable object.
   * @param {String|Object} method name of the method to invoke,
   *  or a configuration object.
   * @return jQuery
   * @class
   * @example
   * $(selector).sketchable();
   * $(selector).sketchable({interactive:false});
   */
  var initfn = availMethods.init;
  availMethods.init = function(opts) {
    var conf = configure(this, opts);
    return initfn.call(this, conf);
  };

})(jQuery);
