$(document).ready(function()
{
    //--- Monaco editor ---//

    let editor;

    require.config({ paths: { 'vs': resourcesUrl + '/lib/monaco-editor/min/vs' }});
    window.MonacoEnvironment = { getWorkerUrl: () => proxy };

    let proxy = URL.createObjectURL(new Blob([`
        self.MonacoEnvironment = {
            baseUrl: '` + resourcesUrl + `/lib/monaco-editor/min/'
        };
        importScripts('` + resourcesUrl + `/lib/monaco-editor/min/vs/base/worker/workerMain.js');
    `], { type: 'text/javascript' }));

    require(["vs/editor/editor.main"], function () {
        monaco.languages.registerCompletionItemProvider('twig', {
            provideCompletionItems: getCompletionItems,
        });

        editor = monaco.editor.create($('#editor')[0], {
            language: 'twig',
            value: $('#input').val(),
            wordWrap: true,
            scrollBeyondLastLine: false,
            lineNumbersMinChars: 4,
            fontSize: 14,
            fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace',
            minimap: {
                enabled: false
            },
        });
    });

    //--- htmx ---//

    htmx.on('htmx:configRequest', function(event) {
        $('.spinner').show();

        event.detail.headers['Sprig-Playground-Component'] = editor.getValue();
        event.detail.headers['Sprig-Playground-Variables'] = $('#input-variables').val();

        if ($('#playground').html() == '') {
            event.detail.headers['HX-Request'] = 'false';
        }
    });

    htmx.on('htmx:afterSwap', function(event) {
        $('.spinner').hide();
        $('#sourcecode').val(html_beautify(event.detail.xhr.responseText));

        $('#output-variables').val(event.detail.xhr.getResponseHeader('Sprig-Playground-Variables'));
    });

    htmx.on('htmx:responseError', function(event) {
        $('.spinner').hide();
        $('#playground').html(`
        <h2 class="error">` + event.detail.xhr.status + ' ' + event.detail.xhr.statusText + `</h2>
        <p>View the full response in the network tab of your browser dev tools.</p>
    `);
        $('#sourcecode').val('');
    });

    //--- Buttons ---//

    $('#create').click(function(event) {
        event.preventDefault();

        $('#playground').html('');
        $('#sourcecode').val('');
        $('#output-variables').val('');

        $('#playground')[0].dispatchEvent(new Event('refresh'));
    });

    $('#output-toggle').click(function(event) {
        event.preventDefault();
        $(this).toggleClass('submit');

        $('.playground #playground').toggle();
        $('.playground #sourcecode').toggle();
    });

    $('#main-form').submit(function(event) {
        $('#main-form textarea[name=component]').val(editor.getValue());
        $('#main-form textarea[name=variables]').val($('#input-variables').val());

        if ($('#main-form input[name=action]:last').val() == 'sprig/playground/save') {
            let name = prompt('Enter a name for this playground.');

            if (name) {
                $('#main-form input[name=name]').val(name);
                return;
            }
        }
        else {
            return;
        }

        event.preventDefault();
    });
});

function getCompletionItems()
{
    let suggestions = [
        {
            label: 'sprig',
            insertText: 'sprig',
            kind: monaco.languages.CompletionItemKind.Function,
            sortText: '_sprig',
        },
    ];

    let suggestionLabels = [
        's-action=""',
        's-method=""', 's-method="post"',
        's-confirm=""',
        's-include=""',
        's-indicator=""',
        's-params=""',
        's-prompt=""',
        's-push-url=""',
        's-select=""',
        's-swap=""', 's-swap="innerHTML"', 's-swap="outerHTML"', 's-swap="beforebegin"', 's-swap="afterbegin"', 's-swap="beforeend"', 's-swap="afterend"',
        's-swap-oob=""',
        's-target=""',
        's-trigger=""', 's-trigger="click"', 's-trigger="change"', 's-trigger="submit"',
        's-vars=""',
    ];

    for (let i = 0; i < suggestionLabels.length; i++) {
        suggestions[i + 1] = {
            label: suggestionLabels[i],
            insertText: suggestionLabels[i],
            kind: monaco.languages.CompletionItemKind.Field,
        };
    }

    return {
        suggestions: suggestions,
    };
}
