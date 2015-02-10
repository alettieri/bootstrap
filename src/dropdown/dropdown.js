/**
 * Drop Down Service
 * This service is used to manage showing and hiding dropdowns.
 * It's job is to listen to dom events for keydowns and document click events to hide open dropdowns
 * It will also ensure that it closes dropdowns in the event that a new one is opened.
 * 
 * @param $document
 */
ServiceDropDown.$inject = ['$document'];
function ServiceDropDown($document) {

  // Holds our last opened dropdown
  var openScope = null;

  /**
   * Opens the the passed in dropdown and closes the previously opened dropdown if it's still open.
   */
  this.open = function (dropdownScope) {
    
    // If there wasn't a previously opened dropdown on the page, 
    //    be sure to bind to the document click and keydown event.
    //
    if (!openScope) {
      // If a user clicks on the document, try closing the dropdown
      $document.bind('click', closeDropdown);
      // If a user hits the escape key, try closing the dropdown
      $document.bind('keydown', escapeKeyBind);
    }

    // If there was a previously opened dropdown, and it's not this dropdown
    //     be sure to close the previously opened one.
    //
    if (openScope && openScope !== dropdownScope) {
      openScope.isOpen = false;
    }

    // Assign the newly opened dropdown to the opened Scoped
    openScope = dropdownScope;
  };

  /**
   * Closes the passed in dropdown scope
   */
  this.close = function (dropdownScope) {

    // If this is the last opened dropdown. 
    //    Be sure to unbind all events and clear the openScoped holder.
    //
    if (openScope === dropdownScope) {
      // Clear the open scope and unbind the click events from the document
      openScope = null;
      $document.unbind('click', closeDropdown);
      $document.unbind('keydown', escapeKeyBind);
    }
  };

  /**
   * Will close the dropdown wether the escape key was hit or the document was clicked
   * @param [event] evt
   */
  var closeDropdown = function (evt) {

    // This method may still be called during the same mouse event that
    // unbound this event handler. So check openScope before proceeding.
    if (!openScope) { return; }

    // Get the current toggleElement
    var toggleElement = openScope.getToggleElement();
    
    // Check to see if we received an event (from the document click).
    //    Then determine if we clicked outisde of the targetElement
    //
    if (evt && toggleElement && toggleElement[0].contains(evt.target)) {

      // We clicked on the target element, don't close it and get out of the function.
      return;
    }

    // We clicked elsewhere on the document, close the current dropdown.
    openScope.$apply(function () {
      openScope.isOpen = false;
    });
  };

  /**
   * $document 'keydown' event handler
   */
  var escapeKeyBind = function (evt) {
    // If it's the esc key, close the dropdown
    if (evt.which === 27) {
      openScope.focusToggleElement();
      closeDropdown();
    }
  };
}

/**
 * DropdownController
 * A new controller is created for each directive that calls it.
 * It can also be shared among other directives.
 * 
 * This controller is responsible for showing and hiding the dropdown element
 * It will also expose methods that the toggle directive can use to toggle the dropdown or watch for isOpen changes
 */
DropDownController.$inject = ['$scope', '$attrs', '$parse', 'dropdownConfig', 'dropdownService', '$animate'];
function DropDownController($scope, $attrs, $parse, dropdownConfig, dropdownService, $animate) {

  var self = this,

    // create a child scope so we are not polluting original one
    scope = $scope.$new(),

    // Get the open class from the dropdown config
    openClass = dropdownConfig.openClass,
    
    // Will use this to parse out the is-open attribute
    getIsOpen,
    
    // Default handler for the setIsOpen method function() {}
    setIsOpen = angular.noop,

    // Either parsed method passed into the on-toggle attribute, or a noop function(){}
    toggleInvoker = $attrs.onToggle ? $parse($attrs.onToggle) : angular.noop;

  /**
   * Sets the Controllers $element property.
   * Initializes then watches the is-open attribute
   */
  this.init = function (element) {

    // Assign the controller.$element property to the <div dropdown></div> element
    self.$element = element;

    // If the is-open attribute is set
    if ($attrs.isOpen) {

      // Parse out the function or property
      getIsOpen = $parse($attrs.isOpen);

      // Assign the setter function to setIsOpen, this will allow us to 
      // Run setIsOpen($scope, true|false); which will apply it to the passed in is-open attribute
      // https://docs.angularjs.org/api/ng/service/$parse
      //
      setIsOpen = getIsOpen.assign;

      // Now watch the is-open attribut for changes
      $scope.$watch(getIsOpen, function (value) {
        // when the value changes, change the internal scope isOpen property to the inverse of value
        scope.isOpen = !!value;
      });
    }
  };

  /*
   * Toggle isOpen property on the internal scope
   */
  this.toggle = function (open) {

    // Change the scope.isOpen property to either the passed in open value or the inverse of the currently set scope.isOpen property
    //   This will trigger the scope.$watch to trigger a change, since we changed the scope.isOpen value
    //
    return scope.isOpen = arguments.length ? !!open : !scope.isOpen;
  };

  // Allow other directives to watch status
  this.isOpen = function () {
    return scope.isOpen;
  };

  // Returns the currently set toggleElement
  scope.getToggleElement = function () {
    return self.toggleElement;
  };

  // Sets focus on the current target element
  scope.focusToggleElement = function () {
    if (self.toggleElement) {
      self.toggleElement[0].focus();
    }
  };

  // Watch the scope isOpen property for changes.
  // This is where all the magic happens in terms of showing and hiding the dropdown
  // 
  scope.$watch('isOpen', function (isOpen, wasOpen) {

    // Either runs $animate.addClass or $animate.removeClass depening on the isOpen value.
    // Basically this adds or removes the 'open' class from the dropdown element.
    //
    $animate[isOpen ? 'addClass' : 'removeClass'](self.$element, openClass);
    

    if (isOpen) {
      // Focus the element
      scope.focusToggleElement();

      // Ask the dropdown service to open this dropdown
      dropdownService.open(scope);

    } else {

      // Ask the dropdown service to close this dropdown
      dropdownService.close(scope);
    }

    setIsOpen($scope, isOpen);

    if (angular.isDefined(isOpen) && isOpen !== wasOpen) {
      toggleInvoker($scope, { open: !!isOpen });
    }
  });

  // If we're changing views, set isOpen to false
  $scope.$on('$locationChangeSuccess', function () {
    scope.isOpen = false;
  });

  // Clean up child scope when the parent scope is being destroyed
  $scope.$on('$destroy', function () {
    scope.$destroy();
  });

}



/**
 * Drop Down Directive
 */
function DropDownDirective() {
  return {
    // Restrict this directive to either a class or attribute
    restrict: 'CA',

    // Create a DropdownController instance for this directive
    controller: 'DropdownController',

    // link method, last parameter is the instance of the DropdownController
    link: function (scope, element, attrs, dropdownCtrl) {

      // Initialize the dropdown controller with element that
      //   has the dropdown attribute
      //   <div dropdown>...</div>
      //
      dropdownCtrl.init(element);
    }
  };
}

/**
 * Drop Down Toggle Directive
 * @requires dropdown controller
 */
function DropDownToggleDirective() {

  /**
   * Link Directive method
   * @param {scope} scope
   * @param {Element} element
   * @param {Object} attrs
   * @param {Controller} dropdownCtrl instance from parent directive (dropdown)
   */
  function link(scope, element, attrs, dropdownCtrl) {

    if (!dropdownCtrl) {
      return;
    }

    // Set the dropdownCtrl toggle directive element
    //    <button class='dropdown-toggle'>...</div>
    //
    dropdownCtrl.toggleElement = element;

    /**
     * Handles the click event on the element
     */
    var toggleDropdown = function (event) {
      event.preventDefault();

      // If the element isn't disabled
      if (!element.hasClass('disabled') && !attrs.disabled) {

        // Toggle the dropdown
        scope.$apply(function () {

          // Call the toggle method on the dropdownCtrl
          dropdownCtrl.toggle();
        });
      }
    };

    // Bind the click event to the element
    element.bind('click', toggleDropdown);

    // WAI-ARIA attributes for accessibility
    element.attr({ 'aria-haspopup': true, 'aria-expanded': false });

    // Watch the dropdownCtrl.isOpen property for changes and set the aria-expanded property to the new value
    scope.$watch(dropdownCtrl.isOpen, function (isOpen) {
      element.attr('aria-expanded', !!isOpen);
    });

    // Be sure to unbind the click event from the element when the scope destroys itself
    scope.$on('$destroy', function () {
      element.unbind('click', toggleDropdown);
    });
  }

  return {
    // Class or Attribute
    restrict: 'CA',
    
    // Requires the dropdown controller instance from the dropdown directive
    // We're re-using the instance of the DropdownController created by the parent directive
    // It will be passed in as the last parameter to the link function
    //
    require: '?^dropdown',

    // Expose link function
    link: link
  };
}

// Register the dropdown directive module
angular.module('ui.bootstrap.dropdown', [])

  // Dropdown Config
  .value('dropdownConfig', {
    openClass: 'open'
  })

  // Register the DropDownService
  .service('dropdownService', ServiceDropDown)

  // Register the DropDownController
  .controller('DropdownController', DropDownController)

  // Register the dropdown directive
  .directive('dropdown', DropDownDirective )

  // Register the dropdownToggle directive
  .directive('dropdownToggle', DropDownToggleDirective)
;