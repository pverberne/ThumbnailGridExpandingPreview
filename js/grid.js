'use strict';

var Grid = {};

document.addEventListener("DOMContentLoaded", function() {

    Grid = (function() {
        // grid selector
        var selector = '#og-grid',
            // list of items
            grid = document.querySelector(selector),
            // the items
            items = Array.from(grid.children),
            // current expanded item's index
            current = -1,
            // position (top) of the expanded item
            // used to know if the preview will expand in a different row
            previewPos = -1,
            // extra amount of pixels to scroll the window
            scrollExtra = 0,
            // extra margin when expanded (between preview overlay and the next items)
            marginExpanded = 10,
            // reduce size of the overlay according to the size of the items row
            // in order to display next row and to incite user to click next items.
            marginItemHeightPercent = 67,
            windowEl = window,
            winsize,
            body = document.documentElement,
            // transitionend events
            transEndEventNames = {
                'WebkitTransition': 'webkitTransitionEnd',
                'MozTransition': 'transitionend',
                'OTransition': 'oTransitionEnd',
                'msTransition': 'MSTransitionEnd',
                'transition': 'transitionend',
            },
            transEndEventName = transEndEventNames[getTransitionEvent()],
            // support for csstransitions
            support = 'transition' in document.documentElement.style,
            // default settings
            settings = {
                minHeight: 500,
                speed: 350,
                easing: 'ease',
                showVisitButton: true,
            };

        function init(config) {
            // the settings…
            settings = Object.assign({}, settings, config);
            // preload all images
            imagesLoaded(grid, function() {
                // save item´s size and offset
                saveItemInfo(true);
                // get window´s size
                getWinSize();
                // initialize some events
                initEvents();
            });
        }

        function initEvents() {
            // when clicking an item, show the preview with the item´s info and large image.
            // close the item if already expanded.
            // also close if clicking on the item´s cross
            initItemsEvents(items);

            // on window resize get the window´s size again
            // reset some values.
            windowEl.addEventListener('resize', debounce(function() {
                scrollExtra = 0;
                previewPos = -1;
                // save item´s offset
                saveItemInfo();
                getWinSize();
                var preview = windowEl.preview;
                if (preview) {
                    hidePreview();
                }
            }, 250));
        }

        function initItemsEvents(items) {
            if (!items) {
                return;
            }
            items.forEach(function(item) {
                const itemClose = item.querySelector('button.og-close');
                if (itemClose) {
                    itemClose.addEventListener('click', function() {
                        hidePreview();
                        return false;
                    });
                }
                const itemButton = item.querySelector('button');
                if (itemButton) {
                    itemButton.addEventListener('click', function() {
                        // check if item already opened
                        current === items.indexOf(item)
                            ? hidePreview()
                            : showPreview(item);
                        return false;
                    });
                }
            });
        }

        // add more items to the grid.
        // the new items need to appended to the grid.
        // after that call Grid.addItems(theItems);
        function addItems(newItems) {
            items = items.concat(Array.from(newItems));
            newItems.forEach(function(item) {
                item.dataset.offsetTop = item.offsetTop;
                item.dataset.height = item.offsetHeight;
            });
            initItemsEvents(newItems);
        }

        // saves the item´s offset top and height (if saveheight is true)
        function saveItemInfo(saveHeight) {
            items.forEach(function(item) {
                item.dataset.offsetTop = item.offsetTop;
                if (saveHeight) {
                    item.dataset.height = item.offsetHeight;
                }
            });
        }

        function getWinSize() {
            winsize = {
                width: windowEl.innerWidth,
                height: windowEl.innerHeight,
            };
        }

        function showPreview(item) {
            var preview = windowEl.preview,
                // item´s offset top
                position = item.dataset.offsetTop;

            scrollExtra = 0;

            // if a preview exists and previewPos is different (different row) from item´s top then close it
            if (preview) {
                // not in the same row
                if (previewPos !== position) {
                    // if position > previewPos then we need to take the current preview´s height in consideration when scrolling the window
                    if (position > previewPos) {
                        scrollExtra = preview.height;
                    }
                    hidePreview();
                }
                // same row
                else {
                    preview.update(item);
                    return false;
                }
            }

            // update previewPos
            previewPos = position;
            // initialize new preview for the clicked item
            preview = windowEl.preview = new Preview(item);
            // expand preview overlay
            preview.open();
        }

        function hidePreview() {
            current = -1;
            var preview = windowEl.preview;
            if (preview) {
                preview.close();
            }
            windowEl.preview = null;
        }

        // the preview obj / overlay
        function Preview(item) {
            this.item = item;
            this.expandedIdx = items.indexOf(this.item);
            this.create();
            this.update();
        }

        Preview.prototype = {
            create: function() {
                // create Preview structure:
                this.title = document.createElement('h3');
                this.description = document.createElement('p');
                var detailAppends = [this.title, this.description];
                if (settings.showVisitButton) {
                    this.href = document.createElement('a');
                    this.href.textContent = 'Visit website';
                    detailAppends.push(this.href);
                }
                this.details = document.createElement('div');
                this.details.className = 'og-details';
                detailAppends.forEach(function(el) {
                    this.details.appendChild(el);
                }, this);
                this.loading = document.createElement('div');
                this.loading.className = 'og-loading';
                this.fullimage = document.createElement('div');
                this.fullimage.className = 'og-fullimg';
                this.fullimage.appendChild(this.loading);
                this.closePreview = document.createElement('button');
                this.closePreview.className = 'og-close';
                this.closePreview.setAttribute('aria-label', 'Close');
                this.previewInner = document.createElement('div');
                this.previewInner.className = 'og-expander-inner';
                [this.closePreview, this.fullimage, this.details].forEach(function(el) {
                    this.previewInner.appendChild(el);
                }, this);
                this.previewEl = document.createElement('div');
                this.previewEl.className = 'og-expander';
                this.previewEl.appendChild(this.previewInner);
                // append preview element to the item
                this.item.appendChild(this.getEl());
                // set the transitions for the preview and the item
                if (support) {
                    this.setTransition();
                }
            },
            update: function(item) {
                if (item) {
                    this.item = item;
                }

                // if already expanded remove class "og-expanded" from current item and add it to new item
                var currentItem;
                if (current !== -1) {
                    items[current].classList.remove('og-expanded');
                    this.item.classList.add('og-expanded');
                    // position the preview correctly
                    this.positionPreview();
                }

                // update current value
                current = items.indexOf(this.item);
                currentItem = items[current];

                // update preview´s content
                var itemButton = this.item.querySelector('button'),
                    eldata = {
                        url: itemButton.dataset.url,
                        largesrc: itemButton.dataset.largesrc.startsWith('http')
                            ? itemButton.dataset.largesrc
                            : new URL(itemButton.dataset.largesrc, window.location.href).href,
                        title: itemButton.dataset.title,
                        description: itemButton.dataset.description,
                    };

                this.title.textContent = eldata.title;
                this.description.textContent = eldata.description;
                if (settings.showVisitButton && eldata.url && eldata.url.length) {
                    this.href.setAttribute('href', eldata.url);
                }

                var self = this;

                // remove the current image in the preview
                if (self.largeImg) {
                    self.largeImg.remove();
                }

                // preload large image and add it to the preview
                // for smaller screens we don´t display the large image (the media query will hide the fullimage wrapper)

                if (self.fullimage.style.display !== 'none') {
                    this.loading.style.display = 'block';
                    const img = new Image();
                    img.onload = function() {
                        const itemButton = self.item.querySelector('button');
                        if (itemButton) {
                            const fullLargeSrc = itemButton.dataset.largesrc.startsWith('http')
                                ? itemButton.dataset.largesrc
                                : new URL(itemButton.dataset.largesrc, window.location.href).href;
                            if (img.src === fullLargeSrc) {
                                self.loading.style.display = 'none';
                                const fullImg = self.fullimage.querySelector('img');
                                if (fullImg) {
                                    fullImg.remove();
                                }
                                self.largeImg = img;
                                self.largeImg.style.display = 'block';
                                self.fullimage.appendChild(self.largeImg);
                            }
                        }
                    };
                    img.src = eldata.largesrc;
                }

                // Add the event to close.
                const itemClose = currentItem.querySelector('button.og-close');
                if (itemClose) {
                    itemClose.addEventListener('click', hidePreview);
                }
            },
            open: function() {
                setTimeout(function() {
                    // set the height for the preview and the item
                    this.setHeights();
                    // scroll to position the preview in the right place
                    this.positionPreview();
                }.bind(this), 25);
            },
            close: function() {
                var self = this,
                    onEndFn = function() {
                        if (support) {
                            self.item.removeEventListener(transEndEventName, onEndFn);
                        }
                        self.item.classList.remove('og-expanded');
                        self.previewEl.remove();
                    };

                setTimeout(function() {
                    if (self.largeImg) {
                        self.largeImg.style.display = 'none';
                    }
                    self.previewEl.style.height = '0';
                    // the current expanded item (might be different from this.item)
                    var expandedItem = items[self.expandedIdx];
                    expandedItem.style.height = expandedItem.dataset.height + 'px';
                    expandedItem.addEventListener(transEndEventName, onEndFn);

                    if (!support) {
                        onEndFn.call();
                    }
                }, 25);

                return false;
            },
            calcHeight: function() {
                var heightPreview = winsize.height - this.item.dataset.height - marginExpanded - (this.item.dataset.height * marginItemHeightPercent / 100),
                itemHeight = winsize.height - (this.item.dataset.height * marginItemHeightPercent / 100);

                if (heightPreview < settings.minHeight) {
                    heightPreview = settings.minHeight;
                    itemHeight = settings.minHeight + this.item.dataset.height + marginExpanded;
                }

                this.height = heightPreview;
                this.itemHeight = itemHeight;
            },
            setHeights: function() {
                var self = this,
                    onEndFn = function() {
                        if (support) {
                            self.item.removeEventListener(transEndEventName, onEndFn);
                        }
                        self.item.classList.add('og-expanded');
                    };

                this.calcHeight();
                this.previewEl.style.height = this.height + 'px';
                this.item.style.height = this.itemHeight + 'px';
                this.item.addEventListener(transEndEventName, onEndFn);

                if (!support) {
                    onEndFn.call();
                }
            },
            positionPreview: function() {
                // scroll page
                // case 1: preview height + item height fits in window´s height
                // case 2: preview height + item height does not fit in window´s height and preview height is smaller than window´s height
                // case 3: preview height + item height does not fit in window´s height and preview height is bigger than window´s height
                var position = this.item.dataset.offsetTop,
                    previewOffsetT = this.previewEl.getBoundingClientRect().top - scrollExtra,
                    scrollVal = this.height + this.item.dataset.height + marginExpanded <= winsize.height
                        ? position
                        : this.height < winsize.height
                            ? previewOffsetT - (winsize.height - this.height)
                            : previewOffsetT;

                body.scrollTo({ top: scrollVal, behavior: 'smooth' });
            },
            setTransition: function() {
                this.previewEl.style.transition = 'height ' + settings.speed + 'ms ' + settings.easing;
                this.item.style.transition = 'height ' + settings.speed + 'ms ' + settings.easing;
            },
            getEl: function() {
                return this.previewEl;
            }
        };

        function debounce(func, wait) {
            var timeout;
            return function() {
                var context = this, args = arguments;
                clearTimeout(timeout);
                timeout = setTimeout(function() {
                    func.apply(context, args);
                }, wait);
            };
        }

        function getTransitionEvent() {
            var el = document.createElement('div');
            for (var t in transEndEventNames) {
                if (el.style[t] !== undefined) {
                    return t;
                }
            }
            return null;
        }

        function imagesLoaded(el, callback) {
            var images = el.querySelectorAll('img');
            var loaded = 0;
            var count = images.length;

            function check() {
                loaded++;
                if (loaded === count) {
                    callback();
                }
            }

            images.forEach(function(img) {
                if (img.complete) {
                    check();
                } else {
                    img.addEventListener('load', check);
                    img.addEventListener('error', check);
                }
            });
        }

        return {
            init: init,
            addItems: addItems,
        };

    })();

});
