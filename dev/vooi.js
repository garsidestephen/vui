// Vooi - www.stephengarside.co.uk

var vooi = (function ()
{
    var cookieNameVuiEnabled = "vuienabled",
        cookieNameVuiDismissed = "vuidismissed",
        cookieNameMicBlocked = "vuimicblocked",
        cookieNameVuiAwake = "vuiawake",
        isVuiEnabled = getCookie(cookieNameVuiEnabled) == 'true',
        isVuiDismissed = getCookie(cookieNameVuiDismissed) == 'true',
        isBrowserSpeechRecognitionEnabled = false,
        isEnabled = false,
        isPaused = false,
        isRecognising = false,
        isMobileDevice = (/Mobi/.test(navigator.userAgent)),
        recognitionObj = null,
        loggingEnabled = false,
        isAsleep = true,
        screenHeight = $(window).height(),
        documentHeight = $(document).height(),
        $htmlBody = null,
        $vuiCta = null,
        $vuiMoreInfo = null,
        $vuiControls = null,
        $vuiSpeech = null,
        $vuiEqualizer = null,
        $vuiResults = null,
        $vuiMicWrap = null,
        $siteSearchField = null,
        $siteSearchForm = null,
        currentPageUrlPath = window.location.href.replace(window.location.origin, ""),
        configurableParams = { "brand": "this website", "desktopOnly": true, "wakeWord": "help", "sleepWord": "goodbye", "vuiCTADismissalPeriodInDays": 0, "accuracyPercentage": 50, "actions": null, "autoEnabled": false, "theme": "red", "siteSearchFieldId": null };

    ///
    /// Init speech recognition service
    ///
    var init = function (params)
    {
        isBrowserSpeechRecognitionEnabled = window.hasOwnProperty('webkitSpeechRecognition') || window.hasOwnProperty('SpeechRecognition');
        setParameters(params);

        if (isValidScreenWidth())
        {
            if (isBrowserSpeechRecognitionEnabled === true && isVuiEnabled === false && isVuiDismissed === false)
            {
                // Browser is capable of speech recog but the user has not enabled it or dismissed the CTA  

                var callbackFn = function ()
                {
                    setTheme();
                    primeVuiCTA();
                };

                buildAndInsertVUIHTML(callbackFn);
            }
            else if (isBrowserSpeechRecognitionEnabled === true && isVuiEnabled === true)
            {
                // Browser is capable of speech recog and user has enabled it

                var callbackFn = function ()
                {
                    setTheme();
                    fadeInVuiControls();

                    if (getCookie(cookieNameVuiAwake) == 'true')
                    {
                        // Put straight into Awake mode
                        startAwakeMode();
                    }
                    else
                    {
                        isAsleep = true;
                    }

                    startVui();
                };

                buildAndInsertVUIHTML(callbackFn);
            }
        }
    }

    ///
    /// Stop speech recognition
    ///
    var stop = function ()
    {
        log('speechRecognitionService.stop');

        isEnabled = false;
        isPaused = false;
        isRecognising = false;

        abortRecognition();
    }

    ///
    /// Pause Recognition
    ///
    var pause = function ()
    {
        log('speechRecognitionService.pause');

        isPaused = true;
        isRecognising = false;

        abortRecognition();
    }

    ///
    /// Start VUI
    ///
    function startVui()
    {
        log('speechRecognitionService.startVui');

        createRecognitionObject();

        isEnabled = true;
        isPaused = false;

        startRecognition();
    }

    ///
    /// Prime Vui CTA
    ///
    function primeVuiCTA()
    {
        // Only show Vui CTA if it is not already enabled and it has not been dismissed in last X days?
        if (isVuiEnabled === false && isVuiDismissed === false)
        {
            $vuiControls.hide();
            $vuiCta.fadeIn();
        }
    }

    ///
    /// Fade Out Vui CTA
    ///
    function fadeOutVuiCTA()
    {
        $vuiCta.fadeOut();
    }

    ///
    /// Hide Vui
    ///
    function hideVui()
    {
        $vuiCta.hide();
        $vuiControls.hide();
    }

    ///
    /// Fade In Vui Controls
    ///
    function fadeInVuiControls()
    {
        $vuiSpeech.hide();
        $vuiControls.fadeIn();
    }

    ///
    /// Is Valid Screen Width
    /// 
    function isValidScreenWidth()
    {
        if (configurableParams.desktopOnly == true)
        {
            return $(window).width() > 960;
        }

        return true;
    }

    ///
    /// Show Speech Message
    ///
    function showSpeechMessage(message)
    {
        if (message && message.length > 0)
        {
            var timeoutLength = message.length * 150;

            $vuiResults.html(annotateMessage(message));
            $vuiSpeech.fadeIn();
            setTimeout(function () { $vuiSpeech.fadeOut(); }, timeoutLength);
        }
    }

    ///
    /// Annotate Message
    ///
    function annotateMessage(message)
    {
        if (testForWakeWord(message))
        {
        }
        else if (testForSleepWord(message))
        {
        }

        return message;
    }

    ///
    /// Start Equalizer
    ///
    function startEqualizer()
    {
        $vuiControls.addClass('vui-awake');
    }

    ///
    /// Stop Equalizer
    ///
    function stopEqualizer()
    {
        $vuiControls.removeClass('vui-awake');
    }

    ///
    /// Fade Out Vui Controls
    ///
    function fadeOutVuiControls()
    {
        $vuiControls.fadeOut();
    }

    ///
    /// Init Vui Keyboard Events
    ///
    function initVuiKeyboardEvents()
    {
        // User clicked to hide VUI CTA
        $('#vui-not-now').on('click', function ()
        {
            dismissVuiCTAForNow();
        });

        // User clicked to enable VUI
        $('#vui-enable').on('click', function ()
        {
            enableVui();
            fadeOutVuiCTA();
            fadeInVuiControls();
            startVui();
        });

        // User clicked to show more info about VUI
        $('#vui-show-more-info').on('click', function ()
        {
            $vuiMoreInfo.slideToggle();
        });

        // User has clicked on Vooi Mic
        $vuiMicWrap.on('click', function ()
        {
            if (confirm('Do you want to close Vooi?'))
            {
                dismissVuiCTAForNow();
                $vuiControls.fadeOut();
                stop();
            }
        });
    }



    ///
    /// Enable Vui
    ///
    function enableVui()
    {
        setCookie(cookieNameVuiEnabled, true, 365);

        if (getCookie(cookieNameMicBlocked) == 'true')
        {
            alert('Thank you for enabling Voo-i but we notice you have previously blocked access to the microphone for this website so you will need to re-enable it before Voo-i will work');
            deleteCookie(cookieNameMicBlocked);
        }
    }

    ///
    /// Dismiss Vui CTA For Now
    ///
    function dismissVuiCTAForNow()
    {
        setCookie(cookieNameVuiDismissed, true, configurableParams.vuiCTADismissalPeriodInDays);
        deleteCookie(cookieNameVuiEnabled);
        fadeOutVuiCTA();
    }

    ///
    /// Create Recognition Object
    ///
    function createRecognitionObject()
    {
        if (recognitionObj == null)
        {
            recognitionObj = new webkitSpeechRecognition();
            recognitionObj.lang = "en-GB";
            recognitionObj.continuous = false;
            recognitionObj.interimResults = false;

            // Only useful events when continuous = true
            recognitionObj.onstart = function () { onStart(); };
            recognitionObj.onend = function () { onEnd(); };
            recognitionObj.onresult = function (event) { onResult(event); };
            recognitionObj.onerror = function (event) { onError(event); };

            // Useful events if Continuous = false 
            // recognitionObj.onspeechstart = function () { onSpeechStart(); };
            // recognitionObj.onspeechend = function () { onSpeechEnd(); };
            // recognitionObj.onaudiostart = function () { onAudioStart(); };
            // recognitionObj.onaudioend = function () { onAudioEnd(); };
            // recognitionObj.onboundary = function () { onBoundary(); };
            // recognitionObj.onresume = function () { onResume(); };
            // recognitionObj.onnomatch = function () { onNoMatch(); };
            // recognitionObj.onsoundstart = function () { onSoundStart(); };
            // recognitionObj.onsoundend = function () { onSoundEnd(); };
        }
    }

    ///
    /// Start recognition
    ///
    function startRecognition()
    {
        if (isRecognising === false)
        {
            log('startRecognition');

            isPaused = false;
            recognitionObj.start();
        }
    }

    ///
    /// Recognition Started
    ///
    function recognitionStarted()
    {
        isRecognising = true;
        $vuiMicWrap.removeClass('vui-not-recognising');
    }

    ///
    /// Recognition ended
    ///
    function recognitionEnded()
    {
        log('recognitionEnded');

        isRecognising = false;

        $vuiMicWrap.addClass('vui-not-recognising');

        if (isEnabled === true && isPaused === false)
        {
            startRecognition();
        }
    }

    ///
    /// Abort Recognition
    /// 
    function abortRecognition()
    {
        if (recognitionObj)
        {
            recognitionObj.abort();
        }
    }

    ///
    /// Process Recognition
    ///
    function processRecognition(event)
    {
        log('processResult');

        if (isEnabled === true && isPaused === false)
        {
            var transcript = event.results[event.results.length - 1][0].transcript;

            if (transcript && transcript != '')
            {
                transcript = cleanUpTranscript(transcript);
                showSpeechMessage(transcript);

                log('processResult - recognised:' + transcript);

                if (isAsleep === true)
                {
                    testForWakeWord(transcript);
                }
                else if (!testForSleepWord(transcript))
                {
                    stopEqualizer();

                    parseForIntent(transcript);
                }
            }
            else
            {
                log('processResult - nothing recognised:');
            }
        }
    }

    ///
    /// Test For WakeWord
    ///
    function testForWakeWord(transcript)
    {
        // Does transcript = wakework?
        if (transcript.trim() == configurableParams.wakeWord)
        {
            startAwakeMode();
        }
    }

    ///
    /// Test For SleepWord
    ///
    function testForSleepWord(transcript)
    {
        // Does transcript = wakework?
        if (transcript.trim() == configurableParams.sleepWord)
        {
            startSleepMode();

            return true;
        }

        return false
    }

    ///
    /// Start Sleep Mode
    ///
    function startSleepMode()
    {
        log('And Sleep - In Sleep Mode!');
        deleteCookie(cookieNameVuiAwake);
        isAsleep = true;
        stopEqualizer();
    }

    ///
    /// Turn on full recognition
    function startAwakeMode()
    {
        isAsleep = false;
        log('In full recognition mode - I am awake!');
        setCookie(cookieNameVuiAwake, true, null);
        startEqualizer();
    }

    ///
    /// Parse For Intent
    ///
    function parseForIntent(transcript)
    {
        if (!intentIsASiteSearch(transcript))
        {
            // Parse Intent
            if (configurableParams.actions && configurableParams.actions.length > 0)
            {
                // First identify any applicable actions for the current context
                var contextActions = [];

                for (var i = 0 ; i < configurableParams.actions.length; i++)
                {
                    var currentAction = configurableParams.actions[i];

                    // Is this current action applicable?
                    if (!currentAction.contexturl || currentAction.contexturl == currentPageUrlPath)
                    {
                        contextActions.push(currentAction);
                    }
                }

                // Do we have any actions for the current context?
                if (contextActions.length > 0)
                {
                    var potentialActions = [],
                        transcriptWords = transcript.split(' '),
                        indexOfHighestAccuracyAction = -1,
                        accuracyScoreboard = [];

                    // Loop through each action applicable to the current context
                    for (var i = 0 ; i < contextActions.length; i++)
                    {
                        var currentAction = contextActions[i];

                        // Does this action have any phrases?
                        if (currentAction.phrases && currentAction.phrases.length > 0)
                        {
                            // Get the accuracy perc we are working to
                            var accuracyPercentageReqd = currentAction.accuracypercentage != null ? currentAction.accuracypercentage : configurableParams.accuracyPercentage,
                                highestAccuracyForThisAction = 0;

                            // Loop through all phrases in this action and identify those that match the transcript by a perc that is greater than the action accuracy perc                        
                            for (var j = 0 ; j < currentAction.phrases.length; j++)
                            {
                                // Split the phrase into words
                                var currentPhrase = currentAction.phrases[j].toLowerCase(),
                                    currentPhraseWords = currentPhrase.split(' '),
                                    percScorePerWord = 100 / currentPhraseWords.length, // transcriptWords.length,
                                    percScoreForThisPhrase = 0;

                                // Loop backwards through all words in the transcript and see if each one exists in current Phrase array
                                for (var k = transcriptWords.length; k > 0; k--)
                                {
                                    var indexOfWordInCurrentPhrasewordsArray = currentPhraseWords.indexOf(transcriptWords[k - 1]);

                                    if (indexOfWordInCurrentPhrasewordsArray > -1)
                                    {
                                        // We have found the word in the transcript so up the score and remove from phrase array so not counted again
                                        percScoreForThisPhrase = percScoreForThisPhrase + percScorePerWord;
                                        currentPhraseWords.splice(indexOfWordInCurrentPhrasewordsArray);
                                    }
                                }

                                // Check if the score for this phrase is the highest in this action
                                if (percScoreForThisPhrase >= highestAccuracyForThisAction)
                                {
                                    highestAccuracyForThisAction = percScoreForThisPhrase;
                                }
                            }

                            // Add the best score for this action to the scoreboard if it has a score high enough
                            if (highestAccuracyForThisAction > (accuracyPercentageReqd - 0.1))
                            {
                                // If this is a click action with granular context give it a little promotion to make it more relevant than a redirect
                                if (currentAction.contexturl && currentAction.contexturl != '' && currentAction.type && currentAction.type == 'click')
                                {
                                    highestAccuracyForThisAction += 1;
                                }

                                accuracyScoreboard.push({ "highestAccuracy": highestAccuracyForThisAction, "index": i });
                            }
                        }
                    }

                    // Do we have any qualifying actions for the transscript?
                    if (accuracyScoreboard.length > 0)
                    {
                        // Yes, get the one with the highest score and implement
                        accuracyScoreboard.reverse();
                        implementAction(contextActions[accuracyScoreboard[0].index]);
                    }
                }
            }
        }
        else
        {
            performSiteSearch(transcript);
        }

        startEqualizer();
    }

    ///
    /// Intent Is A Site Search
    ///
    function intentIsASiteSearch(transcript)
    {
        return transcript &&
            transcript.length > 0 &&
            $siteSearchField != null &&
            $siteSearchForm != null &&
            (transcript.startsWith("search site for ") || transcript.startsWith("search site ") || transcript.startsWith("search for ") || transcript.startsWith("site search for ") || transcript.startsWith("site search "));
    }

    ///
    /// Perform Site Search
    ///
    function performSiteSearch(transcript)
    {
        transcript = transcript.replace("search site for ", "").replace("search site ", "").replace("search for ", "").replace("site search for", "").replace("site search ", "");

        $siteSearchField.val(transcript);
        $siteSearchForm.submit();
    }

    ///
    /// Clean Up Transcript
    ///
    function cleanUpTranscript(transcript)
    {
        return transcript.replace("-", " ").replace(".", "").replace("'", "").toLowerCase();
    }

    ///
    /// Implement Action
    ///
    function implementAction(action)
    {
        if (action && action.type && action.intent)
        {
            switch (action.type.toLowerCase())
            {
                case "redirect":
                    window.location.href = action.intent;
                    break;
                case "click":
                    if (action.intent.indexOf('.') == 0)
                    {
                        // We have a class
                        var eles = document.getElementsByClassName(action.intent.replace('.', ''));

                        if (eles && eles.length > 0)
                        {
                            eles[0].click();
                        }
                    }
                    else if (action.intent.indexOf('#') == 0)
                    {
                        // We have an id
                        var ele = document.getElementById(action.intent.replace('#', ''));

                        if (ele)
                        {
                            ele.click();
                        }
                    }
                    break;
                case "scrolldown":
                    scrollPage(true);
                    break;
                case "scrollup":
                    scrollPage(false);
                    break;
                case "pagetop":
                    doScroll(0);
                    break;
                case "pagebottom":
                    doScroll(documentHeight);
                    break;
                case "back":
                    window.history.back();
                    break;
            }
        }
    }

    ///
    /// Scroll Page
    ///
    function scrollPage(scrollDown)
    {
        var currentScrollTop = $(window).scrollTop(),
            gotoScrollTop = 0;

        if (currentScrollTop >= 0)
        {
            if (scrollDown == true)
            {
                gotoScrollTop = currentScrollTop + (screenHeight * 0.8);
            }
            else
            {
                gotoScrollTop = currentScrollTop - (screenHeight * 0.8);

                if (gotoScrollTop < 0)
                {
                    gotoScrollTop = 0;
                }
            }

            doScroll(gotoScrollTop);
        }
    }

    ///
    /// Do Page Scroll
    ///
    function doScroll(scrollTop)
    {
        if (scrollTop >= 0)
        {
            $htmlBody.animate({
                scrollTop: scrollTop
            }, 1000);
        }
    }

    ///
    /// Set Parameters
    ///
    function setParameters(params)
    {
        if (params)
        {
            params.wakeword != null ? configurableParams.wakeWord = params.wakeword : configurableParams.wakeWord;
            params.sleepword != null ? configurableParams.sleepWord = params.sleepword : configurableParams.sleepWord;
            params.accuracypercentage != null ? configurableParams.accuracyPercentage = params.accuracypercentage : configurableParams.accuracyPercentage;
            params.actions != null ? configurableParams.actions = params.actions : configurableParams.actions;
            params.desktoponly != null ? configurableParams.desktopOnly = params.desktoponly : configurableParams.desktopOnly;
            params.vuictadismissalperiodindays != null ? configurableParams.vuiCTADismissalPeriodInDays = params.vuictadismissalperiodindays : configurableParams.vuiCTADismissalPeriodInDays;
            params.autoEnabled != null ? configurableParams.autoEnabled = params.autoEnabled : configurableParams.autoEnabled;
            params.theme != null ? configurableParams.theme = params.theme : configurableParams.theme;
            params.brand != null ? configurableParams.brand = params.brand : configurableParams.brand;
            params.siteSearchFieldId != null ? configurableParams.siteSearchFieldId = params.siteSearchFieldId : configurableParams.siteSearchFieldId;

            if (configurableParams.autoEnabled === true)
            {
                addAutoEnabledActions();
            }

            if (configurableParams.siteSearchFieldId != null)
            {
                $siteSearchField = $('#' + configurableParams.siteSearchFieldId);

                if ($siteSearchField.length > 0)
                {
                    $siteSearchForm = $siteSearchField.closest("form");
                }
            }
        }
    }

    ///
    /// On Start
    ///
    function onStart()
    {
        log('speechRecognitionService.onStart');

        recognitionStarted();
    }

    ///
    /// On Speech Started
    ///
    function onSpeechStart()
    {
        log('speechRecognitionService.onSpeechStart');
    }

    ///
    /// On Speech End
    ///
    function onSpeechEnd()
    {
        log('speechRecognitionService.onSpeechEnd');
    }

    ///
    /// On Audio Start
    ///
    function onAudioStart()
    {
        log('speechRecognitionService.onAudioStart');
    }

    ///
    /// On Audio End
    ///
    function onAudioEnd()
    {
        log('speechRecognitionService.onAudioEnd');
    }

    ///
    /// On Boundary
    ///
    function onBoundary()
    {
        log('speechRecognitionService.onBoundary');
    }

    ///
    /// On Resume
    ///
    function onResume()
    {
        log('speechRecognitionService.onResume');
    }

    ///
    /// On Result
    ///
    function onResult(event)
    {
        log('speechRecognitionService.onResult');
        processRecognition(event);
    }

    ///
    /// On No Match
    ///
    function onNoMatch(event)
    {
        log('speechRecognitionService.onNoMatch');
    }

    ///
    /// On End
    ///
    function onEnd()
    {
        log('speechRecognitionService.onEnd');
        recognitionEnded();
    }

    ///
    /// Error Occurred
    ///
    function onError(event)
    {
        log('speechRecognitionService.onError');

        if (event.error == "not-allowed")
        {
            stop();
            //deleteCookie(cookieNameVuiEnabled);
            //setCookie(cookieNameMicBlocked, true, 365);
        }
    }

    ///
    /// On Sound Started
    ///
    function onSoundStart()
    {
        log('speechRecognitionService.onSoundStart');
    }

    ///
    /// On Sound Ended
    ///
    function onSoundEnd()
    {
        log('speechRecognitionService.onSoundEnd');
    }

    ///
    /// Log to console
    ///
    function log(message)
    {
        if (loggingEnabled === true)
        {
            console.log(message);
        }
    }

    ///
    /// Add Auto Enabled Actions
    ///
    function addAutoEnabledActions()
    {
        var $allLinks = $('a'),
            $allBtns = $('button'),
            $allData = $('[data-vui-phrases]'),
            counter = 0;

        if ($allLinks.length > 0)
        {
            $allLinks.each(function ()
            {
                var $ele = $(this),
                    eleText = $ele.text();

                counter += 1;

                addAutoEnabledAction(eleText, counter, $ele);
            });
        }

        if ($allBtns.length > 0)
        {
            $allBtns.each(function ()
            {
                var $ele = $(this);

                counter += 1;

                addAutoEnabledAction($ele.text(), counter, $ele);
            });
        }

        // NB if an element has text and vui-phrases, vui-phrases will trump
        if ($allData.length > 0)
        {
            $allData.each(function ()
            {
                var $ele = $(this),
                    eleText = $ele.data('vui-phrases');

                counter += 1;

                addAutoEnabledAction(eleText, counter, $ele);
            });
        }
    }

    ///
    /// Add Auto Enabled Action
    ///
    function addAutoEnabledAction(text, id, $ele)
    {
        if (text != '' && id > 0 && $ele)
        {
            var className = 'vui-ae-' + id,
                phrases = text.split('|'),
                phraseVariations = [];

            $ele.addClass(className);


            // Build Phrase Variations
            for (var i = 0; i < phrases.length; i++)
            {
                var phrase = phrases[i];

                if (phraseVariations.indexOf(phrase) == -1)
                {
                    if (phrase.startsWith("go to ") || phrase.startsWith("goto ") || phrase.startsWith("click "))
                    {
                        phraseVariations.push(phrase);
                    }
                    else
                    {
                        phraseVariations.push("go to " + phrase);
                        phraseVariations.push("goto " + phrase);
                        phraseVariations.push("click " + phrase);
                    }
                }
            }

            configurableParams.actions.push({ "contexturl": currentPageUrlPath, "type": "click", "phrases": phraseVariations, "intent": '.' + className, "accuracypercentage": configurableParams.accuracyPercentage });
        }
    }

    ///
    /// Set Cookie
    ///
    function setCookie(name, value, exdays)
    {
        var expires = "";

        if (exdays)
        {
            var d = new Date();
            d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
            expires = "expires=" + d.toUTCString();
        }

        document.cookie = name + "=" + value + ";" + expires + ";path=/";
    }

    ///
    /// Get Cookie
    ///
    function getCookie(cookieName)
    {
        var name = cookieName + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');

        for (var i = 0; i < ca.length; i++)
        {
            var c = ca[i];

            while (c.charAt(0) == ' ')
            {
                c = c.substring(1);
            }

            if (c.indexOf(name) == 0)
            {
                return c.substring(name.length, c.length);
            }
        }

        return "";
    }

    ///
    /// Delete Cookie
    ///
    function deleteCookie(cookieName)
    {
        document.cookie = cookieName + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }

    ///
    /// Build And Insert VUI HTML
    ///
    function buildAndInsertVUIHTML(callbackFn)
    {
        $.get("/vui/vooi.html", function (html)
        {
            $('body').append(html);

            $('.vui-cta--brand').text(configurableParams.brand);
            $('#vui-information--wakeword').text(configurableParams.wakeWord);
            $('#vui-information--sleepword').text(configurableParams.sleepWord);
            $htmlBody = $('html, body');
            $vuiCta = $('#vui-cta');
            $vuiMoreInfo = $('#vui-cta .vui-cta--information');
            $vuiControls = $('#vui-controls');
            $vuiSpeech = $('#vui-controls .vui-speech-wrap');
            $vuiEqualizer = $('#vui-controls .vui-equalizer');
            $vuiResults = $('#vui-results');
            $vuiMicWrap = $('.vui-mic-wrap');

            initVuiKeyboardEvents();

            if (callbackFn)
            {
                callbackFn();
            }
        });
    }

    ///
    /// Set Theme
    ///
    function setTheme()
    {
        var themeName = 'vui-theme-' + configurableParams.theme;
        $vuiCta.addClass(themeName);
        $vuiControls.addClass(themeName);
    }

    ///
    /// Get Query String Param by Name
    ///
    function getParameterByName(name, url)
    {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    return {
        Init: function (params) { init(params); },
        Stop: stop,
        Pause: pause
    }
})();
