/**
 * @file
 * JavaScript behaviors for CodeMirror integration.
 */

(function ($, Drupal) {

  'use strict';

  // @see http://codemirror.net/doc/manual.html#config
  Drupal.webform = Drupal.webform || {};
  Drupal.webform.codeMirror = Drupal.webform.codeMirror || {};
  Drupal.webform.codeMirror.options = Drupal.webform.codeMirror.options || {};

  /**
   * Initialize CodeMirror editor.
   *
   * @type {Drupal~behavior}
   */
  Drupal.behaviors.webformCodeMirror = {
    attach: function (context) {
      if (!window.CodeMirror) {
        return;
      }

      // Webform CodeMirror editor.
      $(context).find('textarea.js-webform-codemirror').once('webform-codemirror').each(function () {
        var $input = $(this);

        // Open all closed details, so that editor height is correctly calculated.
        var $details = $input.parents('details:not([open])');
        $details.attr('open', 'open');

        // #59 HTML5 required attribute breaks hack for webform submission.
        // https://github.com/marijnh/CodeMirror-old/issues/59
        $input.removeAttr('required');

        var options = $.extend({
          mode: $input.attr('data-webform-codemirror-mode'),
          lineNumbers: true,
          lineWrapping: ($input.attr('wrap') !== 'off'),
          viewportMargin: Infinity,
          readOnly: !!($input.prop('readonly') || $input.prop('disabled')),
          extraKeys: {
            // Setting for using spaces instead of tabs - https://github.com/codemirror/CodeMirror/issues/988
            Tab: function (cm) {
              var spaces = Array(cm.getOption('indentUnit') + 1).join(' ');
              cm.replaceSelection(spaces, 'end', '+element');
            },
            // On 'Escape' move to the next tabbable input.
            // @see http://bgrins.github.io/codemirror-accessible/
            Esc: function (cm) {
              // Must show and then textarea so that we can determine
              // its tabindex.
              var textarea = $(cm.getTextArea());
              $(textarea).show().addClass('visually-hidden');
              var $tabbable = $(':tabbable');
              var tabindex = $tabbable.index(textarea);
              $(textarea).hide().removeClass('visually-hidden');

              // Tabindex + 2 accounts for the CodeMirror's iframe.
              $tabbable.eq(tabindex + 2).focus();
            }

          }
        }, Drupal.webform.codeMirror.options);

        var editor = CodeMirror.fromTextArea(this, options);

        // Now, close details.
        $details.removeAttr('open');

        // Apply the textarea's min/max-height to the CodeMirror editor.
        if ($input.css('min-height')) {
          var minHeight = $input.css('min-height');
          $(editor.getWrapperElement())
            .css('min-height', minHeight)
            .find('.CodeMirror-scroll')
            .css('min-height', minHeight);
        }
        if ($input.css('max-height')) {
          var maxHeight = $input.css('max-height');
          $(editor.getWrapperElement())
            .css('max-height', maxHeight)
            .find('.CodeMirror-scroll')
            .css('max-height', maxHeight);
        }

        // Issue #2764443: CodeMirror is not setting submitted value when
        // rendered within a webform UI dialog or within an Ajaxified element.
        var changeTimer = null;
        editor.on('change', function () {
          if (changeTimer) {
            window.clearTimeout(changeTimer);
            changeTimer = null;
          }
          changeTimer = setTimeout(function () {editor.save();}, 500);
        });

        // Update CodeMirror when the textarea's value has changed.
        // @see webform.states.js
        $input.on('change', function () {
          editor.getDoc().setValue($input.val());
        });

        // Set CodeMirror to be readonly when the textarea is disabled.
        // @see webform.states.js
        $input.on('webform:disabled', function () {
          editor.setOption('readOnly', $input.is(':disabled'));
        });

        // Delay refreshing CodeMirror for 500 millisecond while the dialog is
        // still being rendered.
        // @see http://stackoverflow.com/questions/8349571/codemirror-editor-is-not-loading-content-until-clicked
        setTimeout(function () {
          // Show tab panel and open details.
          var $tabPanel = $input.parents('.ui-tabs-panel:hidden');
          var $details = $input.parents('details:not([open])');

          if (!$tabPanel.length && $details.length) {
            return;
          }

          $tabPanel.show();
          $details.attr('open', 'open');

          editor.refresh();

          // Hide tab panel and close details.
          $tabPanel.hide();
          $details.removeAttr('open');
        }, 500);
      });

      // Webform CodeMirror syntax coloring.
      if (window.CodeMirror.runMode) {
        $(context).find('.js-webform-codemirror-runmode').once('webform-codemirror-runmode').each(function () {
          // Mode Runner - http://codemirror.net/demo/runmode.html
          CodeMirror.runMode($(this).addClass('cm-s-default').text(), $(this).attr('data-webform-codemirror-mode'), this);
        });
      }

    }
  };

})(jQuery, Drupal);
;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

(function ($, Drupal) {
  Drupal.behaviors.detailsAria = {
    attach: function attach() {
      $('body').once('detailsAria').on('click.detailsAria', 'summary', function (event) {
        var $summary = $(event.currentTarget);
        var open = $(event.currentTarget.parentNode).attr('open') === 'open' ? 'false' : 'true';

        $summary.attr({
          'aria-expanded': open,
          'aria-pressed': open
        });
      });
    }
  };
})(jQuery, Drupal);;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

(function ($, Modernizr, Drupal) {
  function CollapsibleDetails(node) {
    this.$node = $(node);
    this.$node.data('details', this);

    var anchor = window.location.hash && window.location.hash !== '#' ? ', ' + window.location.hash : '';
    if (this.$node.find('.error' + anchor).length) {
      this.$node.attr('open', true);
    }

    this.setupSummary();

    this.setupLegend();
  }

  $.extend(CollapsibleDetails, {
    instances: []
  });

  $.extend(CollapsibleDetails.prototype, {
    setupSummary: function setupSummary() {
      this.$summary = $('<span class="summary"></span>');
      this.$node.on('summaryUpdated', $.proxy(this.onSummaryUpdated, this)).trigger('summaryUpdated');
    },
    setupLegend: function setupLegend() {
      var $legend = this.$node.find('> summary');

      $('<span class="details-summary-prefix visually-hidden"></span>').append(this.$node.attr('open') ? Drupal.t('Hide') : Drupal.t('Show')).prependTo($legend).after(document.createTextNode(' '));

      $('<a class="details-title"></a>').attr('href', '#' + this.$node.attr('id')).prepend($legend.contents()).appendTo($legend);

      $legend.append(this.$summary).on('click', $.proxy(this.onLegendClick, this));
    },
    onLegendClick: function onLegendClick(e) {
      this.toggle();
      e.preventDefault();
    },
    onSummaryUpdated: function onSummaryUpdated() {
      var text = $.trim(this.$node.drupalGetSummary());
      this.$summary.html(text ? ' (' + text + ')' : '');
    },
    toggle: function toggle() {
      var _this = this;

      var isOpen = !!this.$node.attr('open');
      var $summaryPrefix = this.$node.find('> summary span.details-summary-prefix');
      if (isOpen) {
        $summaryPrefix.html(Drupal.t('Show'));
      } else {
        $summaryPrefix.html(Drupal.t('Hide'));
      }

      setTimeout(function () {
        _this.$node.attr('open', !isOpen);
      }, 0);
    }
  });

  Drupal.behaviors.collapse = {
    attach: function attach(context) {
      if (Modernizr.details) {
        return;
      }
      var $collapsibleDetails = $(context).find('details').once('collapse').addClass('collapse-processed');
      if ($collapsibleDetails.length) {
        for (var i = 0; i < $collapsibleDetails.length; i++) {
          CollapsibleDetails.instances.push(new CollapsibleDetails($collapsibleDetails[i]));
        }
      }
    }
  };

  var handleFragmentLinkClickOrHashChange = function handleFragmentLinkClickOrHashChange(e, $target) {
    $target.parents('details').not('[open]').find('> summary').trigger('click');
  };

  $('body').on('formFragmentLinkClickOrHashChange.details', handleFragmentLinkClickOrHashChange);

  Drupal.CollapsibleDetails = CollapsibleDetails;
})(jQuery, Modernizr, Drupal);;
/*! jQuery UI - v1.12.1 - 2017-03-31
* http://jqueryui.com
* Copyright jQuery Foundation and other contributors; Licensed  */
!function(a){"function"==typeof define&&define.amd?define(["jquery","../keycode","../position","../unique-id","../version","../widget"],a):a(jQuery)}(function(a){return a.widget("ui.tooltip",{version:"1.12.1",options:{classes:{"ui-tooltip":"ui-corner-all ui-widget-shadow"},content:function(){var b=a(this).attr("title")||"";return a("<a>").text(b).html()},hide:!0,items:"[title]:not([disabled])",position:{my:"left top+15",at:"left bottom",collision:"flipfit flip"},show:!0,track:!1,close:null,open:null},_addDescribedBy:function(b,c){var d=(b.attr("aria-describedby")||"").split(/\s+/);d.push(c),b.data("ui-tooltip-id",c).attr("aria-describedby",a.trim(d.join(" ")))},_removeDescribedBy:function(b){var c=b.data("ui-tooltip-id"),d=(b.attr("aria-describedby")||"").split(/\s+/),e=a.inArray(c,d);e!==-1&&d.splice(e,1),b.removeData("ui-tooltip-id"),d=a.trim(d.join(" ")),d?b.attr("aria-describedby",d):b.removeAttr("aria-describedby")},_create:function(){this._on({mouseover:"open",focusin:"open"}),this.tooltips={},this.parents={},this.liveRegion=a("<div>").attr({role:"log","aria-live":"assertive","aria-relevant":"additions"}).appendTo(this.document[0].body),this._addClass(this.liveRegion,null,"ui-helper-hidden-accessible"),this.disabledTitles=a([])},_setOption:function(b,c){var d=this;this._super(b,c),"content"===b&&a.each(this.tooltips,function(a,b){d._updateContent(b.element)})},_setOptionDisabled:function(a){this[a?"_disable":"_enable"]()},_disable:function(){var b=this;a.each(this.tooltips,function(c,d){var e=a.Event("blur");e.target=e.currentTarget=d.element[0],b.close(e,!0)}),this.disabledTitles=this.disabledTitles.add(this.element.find(this.options.items).addBack().filter(function(){var b=a(this);if(b.is("[title]"))return b.data("ui-tooltip-title",b.attr("title")).removeAttr("title")}))},_enable:function(){this.disabledTitles.each(function(){var b=a(this);b.data("ui-tooltip-title")&&b.attr("title",b.data("ui-tooltip-title"))}),this.disabledTitles=a([])},open:function(b){var c=this,d=a(b?b.target:this.element).closest(this.options.items);d.length&&!d.data("ui-tooltip-id")&&(d.attr("title")&&d.data("ui-tooltip-title",d.attr("title")),d.data("ui-tooltip-open",!0),b&&"mouseover"===b.type&&d.parents().each(function(){var b,d=a(this);d.data("ui-tooltip-open")&&(b=a.Event("blur"),b.target=b.currentTarget=this,c.close(b,!0)),d.attr("title")&&(d.uniqueId(),c.parents[this.id]={element:this,title:d.attr("title")},d.attr("title",""))}),this._registerCloseHandlers(b,d),this._updateContent(d,b))},_updateContent:function(a,b){var c,d=this.options.content,e=this,f=b?b.type:null;return"string"==typeof d||d.nodeType||d.jquery?this._open(b,a,d):(c=d.call(a[0],function(c){e._delay(function(){a.data("ui-tooltip-open")&&(b&&(b.type=f),this._open(b,a,c))})}),void(c&&this._open(b,a,c)))},_open:function(b,c,d){function e(a){j.of=a,g.is(":hidden")||g.position(j)}var f,g,h,i,j=a.extend({},this.options.position);if(d){if(f=this._find(c))return void f.tooltip.find(".ui-tooltip-content").html(d);c.is("[title]")&&(b&&"mouseover"===b.type?c.attr("title",""):c.removeAttr("title")),f=this._tooltip(c),g=f.tooltip,this._addDescribedBy(c,g.attr("id")),g.find(".ui-tooltip-content").html(d),this.liveRegion.children().hide(),i=a("<div>").html(g.find(".ui-tooltip-content").html()),i.removeAttr("name").find("[name]").removeAttr("name"),i.removeAttr("id").find("[id]").removeAttr("id"),i.appendTo(this.liveRegion),this.options.track&&b&&/^mouse/.test(b.type)?(this._on(this.document,{mousemove:e}),e(b)):g.position(a.extend({of:c},this.options.position)),g.hide(),this._show(g,this.options.show),this.options.track&&this.options.show&&this.options.show.delay&&(h=this.delayedShow=setInterval(function(){g.is(":visible")&&(e(j.of),clearInterval(h))},a.fx.interval)),this._trigger("open",b,{tooltip:g})}},_registerCloseHandlers:function(b,c){var d={keyup:function(b){if(b.keyCode===a.ui.keyCode.ESCAPE){var d=a.Event(b);d.currentTarget=c[0],this.close(d,!0)}}};c[0]!==this.element[0]&&(d.remove=function(){this._removeTooltip(this._find(c).tooltip)}),b&&"mouseover"!==b.type||(d.mouseleave="close"),b&&"focusin"!==b.type||(d.focusout="close"),this._on(!0,c,d)},close:function(b){var c,d=this,e=a(b?b.currentTarget:this.element),f=this._find(e);return f?(c=f.tooltip,void(f.closing||(clearInterval(this.delayedShow),e.data("ui-tooltip-title")&&!e.attr("title")&&e.attr("title",e.data("ui-tooltip-title")),this._removeDescribedBy(e),f.hiding=!0,c.stop(!0),this._hide(c,this.options.hide,function(){d._removeTooltip(a(this))}),e.removeData("ui-tooltip-open"),this._off(e,"mouseleave focusout keyup"),e[0]!==this.element[0]&&this._off(e,"remove"),this._off(this.document,"mousemove"),b&&"mouseleave"===b.type&&a.each(this.parents,function(b,c){a(c.element).attr("title",c.title),delete d.parents[b]}),f.closing=!0,this._trigger("close",b,{tooltip:c}),f.hiding||(f.closing=!1)))):void e.removeData("ui-tooltip-open")},_tooltip:function(b){var c=a("<div>").attr("role","tooltip"),d=a("<div>").appendTo(c),e=c.uniqueId().attr("id");return this._addClass(d,"ui-tooltip-content"),this._addClass(c,"ui-tooltip","ui-widget ui-widget-content"),c.appendTo(this._appendTo(b)),this.tooltips[e]={element:b,tooltip:c}},_find:function(a){var b=a.data("ui-tooltip-id");return b?this.tooltips[b]:null},_removeTooltip:function(a){a.remove(),delete this.tooltips[a.attr("id")]},_appendTo:function(a){var b=a.closest(".ui-front, dialog");return b.length||(b=this.document[0].body),b},_destroy:function(){var b=this;a.each(this.tooltips,function(c,d){var e=a.Event("blur"),f=d.element;e.target=e.currentTarget=f[0],b.close(e,!0),a("#"+c).remove(),f.data("ui-tooltip-title")&&(f.attr("title")||f.attr("title",f.data("ui-tooltip-title")),f.removeData("ui-tooltip-title"))}),this.liveRegion.remove()}}),a.uiBackCompat!==!1&&a.widget("ui.tooltip",a.ui.tooltip,{options:{tooltipClass:null},_tooltip:function(){var a=this._superApply(arguments);return this.options.tooltipClass&&a.tooltip.addClass(this.options.tooltipClass),a}}),a.ui.tooltip});;
/**
 * @file
 * JavaScript behaviors for element help text (tooltip).
 */

(function ($, Drupal) {

  'use strict';

  // @see http://api.jqueryui.com/tooltip/
  Drupal.webform = Drupal.webform || {};
  Drupal.webform.elementHelpIcon = Drupal.webform.elementHelpIcon || {};
  Drupal.webform.elementHelpIcon.options = Drupal.webform.elementHelpIcon.options || {
    position: {my: 'left+5 top+5', at: 'left bottom', collision: 'flipfit'},
    tooltipClass: 'webform-element-help--tooltip',
    // @see https://stackoverflow.com/questions/18231315/jquery-ui-tooltip-html-with-links
    show: {delay: 100},
    close: function (event, ui) {
      ui.tooltip.hover(
        function () {
          $(this).stop(true).fadeTo(400, 1);
        },
        function () {
          $(this).fadeOut('400', function () {
            $(this).remove();
          });
        });
    }
  };

  /**
   * Element help icon.
   *
   * @type {Drupal~behavior}
   */
  Drupal.behaviors.webformElementHelpIcon = {
    attach: function (context) {
      $(context).find('.js-webform-element-help').once('webform-element-help').each(function () {
        var $link = $(this);

        var options = $.extend({
          // Use 'data-webform-help' attribute which can include HTML markup.
          content: $link.attr('data-webform-help'),
          items: '[data-webform-help]'
        }, Drupal.webform.elementHelpIcon.options);

        $link.tooltip(options)
          .on('click', function (event) {
            // Prevent click from toggling <label>s wrapped around help.
            event.preventDefault();
          }).on('keydown', function (event) {
            // Prevent ESC from from closing dialogs.
            if (event.keyCode === $.ui.keyCode.ESCAPE) {
              event.stopPropagation();
            }
          });

        // Help tooltips are generally placed with <label> tags.
        // Screen readers are also reading the <label> and the
        // 'aria-describedby' attribute.
        // To prevent this issue we are removing the <label>'s 'for' attribute
        // when the tooltip is focused.
        var $label = $(this).parent('label');
        var labelFor = $label.attr('for') || '';
        if ($label.length && labelFor) {
          $link
            .on('focus', function () {
              $label.removeAttr('for');
            })
            .on('blur', function () {
              $label.attr('for', labelFor);
            });
        }
      });
    }
  };

})(jQuery, Drupal);
;
/**
 * @file
 * JavaScript behaviors for select menu.
 */

(function ($, Drupal) {

  'use strict';

  /**
   * Disable select menu options using JavaScript.
   *
   * @type {Drupal~behavior}
   */
  Drupal.behaviors.webformSelectOptionsDisabled = {
    attach: function (context) {
      $('select[data-webform-select-options-disabled]', context).once('webform-select-options-disabled').each(function () {
        var $select = $(this);
        var disabled = $select.attr('data-webform-select-options-disabled').split(/\s*,\s*/);
        $select.find('option').filter(function isDisabled() {
          return ($.inArray(this.value, disabled) !== -1);
        }).attr('disabled', 'disabled');
      });
    }
  };


})(jQuery, Drupal);
;
/**
 * @file
 * JavaScript behaviors for element #states.
 */

(function ($, Drupal, drupalSettings) {

  'use strict';

  /**
   * Element #states builder.
   *
   * @type {Drupal~behavior}
   */
  Drupal.behaviors.webformElementStates = {
    attach: function (context) {
      $(context).find('.webform-states-table--condition').once('webform-element-states-condition').each(function () {
        var $condition = $(this);
        var $selector = $condition.find('.webform-states-table--selector select');
        var $value = $condition.find('.webform-states-table--value input');
        var $trigger = $condition.find('.webform-states-table--trigger select');

        // Initialize autocompletion.
        $value.autocomplete({minLength: 0}).on('focus', function () {
          $value.autocomplete('search', '');
        });

        // Initialize trigger and selector.
        $trigger.on('change', function () {$selector.change();});

        $selector.on('change', function () {
          var selector = $selector.val();
          var sourceKey = drupalSettings.webformElementStates.selectors[selector];
          var source = drupalSettings.webformElementStates.sources[sourceKey];
          var notPattern = ($trigger.val().indexOf('pattern') === -1);
          if (source && notPattern) {
            // Enable autocompletion.
            $value
              .autocomplete('option', 'source', source)
              .addClass('form-autocomplete');
          }
          else {
            // Disable autocompletion.
            $value
              .autocomplete('option', 'source', [])
              .removeClass('form-autocomplete');
          }
          // Always disable browser auto completion.
          $value.attr('autocomplete', 'off');
        }).change();
      });

      // If the states:state is required or optional the required checkbox
      // should be checked and disabled.
      var $state = $(context).find('.webform-states-table--state select');
      if ($state.length) {
        $state.once('webform-element-states-state')
          .on('change', toggleRequiredCheckbox);
        toggleRequiredCheckbox();
      }
    }
  };

  /**
   * Track required checked state.
   *
   * @type {null|boolean}
   */
  var requiredChecked = null;

  /**
   * Toggle the required checkbox when states:state is required or optional.
   */
  function toggleRequiredCheckbox() {
    var $input = $('input[name="properties[required]"]');
    if (!$input.length) {
      return;
    }

    // Determine if any states:state is required or optional.
    var required = false;
    $('.webform-states-table--state select').each(function () {
      var value = $(this).val();
      if (value === 'required' || value === 'optional') {
        required = true;
      }
    });

    if (required) {
      requiredChecked = $input.prop('checked');
      $input.attr('disabled', true);
      $input.prop('checked', true);
    }
    else {
      $input.attr('disabled', false);
      if (requiredChecked !== null) {
        $input.prop('checked', requiredChecked);
        requiredChecked = null;
      }
    }
    $input.change();
  }

})(jQuery, Drupal, drupalSettings);
;
/**
 * @file
 * JavaScript behaviors for tableselect enhancements.
 *
 * @see core/misc/tableselect.es6.js
 */

(function ($, Drupal) {

  'use strict';

  /**
   * Initialize and tweak webform tableselect behavior.
   *
   * @type {Drupal~behavior}
   */
  Drupal.behaviors.webformTableSelect = {
    attach: function (context) {
      $(context)
        .find('table.js-webform-tableselect')
        .once('webform-tableselect')
        .each(Drupal.webformTableSelect);
    }
  };

  /**
   * Callback used in {@link Drupal.behaviors.tableSelect}.
   */
  Drupal.webformTableSelect = function () {
    var $table = $(this);

    // Set default table rows to .selected class.
    $table.find('tr').each(function () {
      // Set table row selected for checkboxes.
      var $tr = $(this);
      if ($tr.find('input[type="checkbox"]:checked').length && !$tr.hasClass('selected')) {
        $tr.addClass('selected');
      }
    });

    // Add .selected class event handler to all tableselect elements.
    // Currently .selected is only added to tables with .select-all.
    if ($table.find('th.select-all').length === 0) {
      $table.find('td input[type="checkbox"]:enabled').on('click', function () {
        $(this).closest('tr').toggleClass('selected', this.checked);
      });
    }

    // Add click event handler to the table row that toggles the
    // checkbox or radio.
    $table.find('tr').on('click', function (event) {
      if ($.inArray(event.target.tagName, ['A', 'BUTTON', 'INPUT', 'SELECT']) !== -1) {
        return true;
      }

      var $tr = $(this);
      var $checkbox = $tr.find('td input[type="checkbox"]:enabled, td input[type="radio"]:enabled');
      if ($checkbox.length === 0) {
        return true;
      }

      $checkbox.click();
    });
  };

})(jQuery, Drupal);
;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

(function (Drupal) {
  Drupal.theme.checkbox = function () {
    return "<input type=\"checkbox\" class=\"form-checkbox\"/>";
  };
})(Drupal);;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

(function ($, Drupal) {
  Drupal.behaviors.tableSelect = {
    attach: function attach(context, settings) {
      $(context).find('th.select-all').closest('table').once('table-select').each(Drupal.tableSelect);
    }
  };

  Drupal.tableSelect = function () {
    if ($(this).find('td input[type="checkbox"]').length === 0) {
      return;
    }

    var table = this;
    var checkboxes = void 0;
    var lastChecked = void 0;
    var $table = $(table);
    var strings = {
      selectAll: Drupal.t('Select all rows in this table'),
      selectNone: Drupal.t('Deselect all rows in this table')
    };
    var updateSelectAll = function updateSelectAll(state) {
      $table.prev('table.sticky-header').addBack().find('th.select-all input[type="checkbox"]').each(function () {
        var $checkbox = $(this);
        var stateChanged = $checkbox.prop('checked') !== state;

        $checkbox.attr('title', state ? strings.selectNone : strings.selectAll);

        if (stateChanged) {
          $checkbox.prop('checked', state).trigger('change');
        }
      });
    };

    $table.find('th.select-all').prepend($(Drupal.theme('checkbox')).attr('title', strings.selectAll)).on('click', function (event) {
      if ($(event.target).is('input[type="checkbox"]')) {
        checkboxes.each(function () {
          var $checkbox = $(this);
          var stateChanged = $checkbox.prop('checked') !== event.target.checked;

          if (stateChanged) {
            $checkbox.prop('checked', event.target.checked).trigger('change');
          }

          $checkbox.closest('tr').toggleClass('selected', this.checked);
        });

        updateSelectAll(event.target.checked);
      }
    });

    checkboxes = $table.find('td input[type="checkbox"]:enabled').on('click', function (e) {
      $(this).closest('tr').toggleClass('selected', this.checked);

      if (e.shiftKey && lastChecked && lastChecked !== e.target) {
        Drupal.tableSelectRange($(e.target).closest('tr')[0], $(lastChecked).closest('tr')[0], e.target.checked);
      }

      updateSelectAll(checkboxes.length === checkboxes.filter(':checked').length);

      lastChecked = e.target;
    });

    updateSelectAll(checkboxes.length === checkboxes.filter(':checked').length);
  };

  Drupal.tableSelectRange = function (from, to, state) {
    var mode = from.rowIndex > to.rowIndex ? 'previousSibling' : 'nextSibling';

    for (var i = from[mode]; i; i = i[mode]) {
      var $i = $(i);

      if (i.nodeType !== 1) {
        continue;
      }

      $i.toggleClass('selected', state);
      $i.find('input[type="checkbox"]').prop('checked', state);

      if (to.nodeType) {
        if (i === to) {
          break;
        }
      } else if ($.filter(to, [i]).r.length) {
          break;
        }
    }
  };
})(jQuery, Drupal);;
