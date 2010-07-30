(function() {

// ==UserScript==
// @name          uso - Count Issues
// @namespace     http://userscripts.org/users/37004
// @description   Counts the issues and places the appropriate count on the Issues tab
// @copyright     2010+, Marti Martz (http://userscripts.org/users/37004)
// @contributor   sizzlemctwizzle (http://userscripts.org/users/27715)
// @license       GPL version 3 or any later version; http://www.gnu.org/copyleft/gpl.html
// @license       Creative Commons; http://creativecommons.org/licenses/by-nc-nd/3.0/
// @version       0.1.10
// @include   http://userscripts.org/scripts/*/*
// @include   https://userscripts.org/scripts/*/*
// @include   http://userscripts.org/topics/*
// @include   https://userscripts.org/topics/*
// @include   http://userscripts.org/reviews/*
// @include   https://userscripts.org/reviews/*
// @exclude http://userscripts.org/scripts/source/*.meta.js
// @exclude https://userscripts.org/scripts/source/*.meta.js
// @exclude http://userscripts.org/scripts/diff/*
// @exclude https://userscripts.org/scripts/diff/*
// @exclude http://userscripts.org/scripts/version/*
// @exclude https://userscripts.org/scripts/version/*
// @require http://usocheckup.redirectme.net/69307.js?method=install&open=window&maxage=14&custom=yes&topicid=46434&id=usoCheckup
// @require http://userscripts.org/scripts/source/61794.user.js
// ==/UserScript==

  function nsResolver(prefix) {
    var ns = {
      "xhtml": "http://www.w3.org/1999/xhtml"
    };
    return ns[prefix] || null;
  }

  var xpr = document.evaluate(
    "//h1[@class='title']",
    document.documentElement,
    null,
    XPathResult.ANY_UNORDERED_NODE_TYPE,
    null
  );

  var titleNode = null;
  if (xpr && xpr.singleNodeValue)
    titleNode = xpr.singleNodeValue;

  function getScriptid() {
    var scriptid = window.location.pathname.match(/\/scripts\/.+\/(\d+)/i);
    if (!scriptid) {
      if (titleNode)
        scriptid = titleNode.firstChild.pathname.match(/\/scripts\/show\/(\d+)/i);
    }
    return (scriptid) ? scriptid[1] : undefined;
  }

  var scriptid = getScriptid();
  if (scriptid) {

    function getDocument(url, callback) {
      var rex = new RegExp(url + ".*", "i");
      var uri = "http://" + window.location.host + window.location.pathname + window.location.search + window.location.hash;
      if (uri.match(rex)) {
        callback(document);
      }
      else {
        GM_xmlhttpRequest({
          method: "GET",
          url: url,
          onload: function (xhr) {

            // Attempt(s) to fix XHTML error(s) on USO
            var usoTitle = titleNode.textContent;
            
            var matches = usoTitle.match(/&/ig);
            if (matches)
              xhr.responseText = xhr.responseText.replace(usoTitle, usoTitle.replace(/&/gi, "&amp;"), "gmi" );
            
            var d = new DOMParser().parseFromString(xhr.responseText, "text/xml");
            if ( d.documentElement.firstChild == "[object XPCNativeWrapper [object Text]]"
              && d.documentElement.firstChild.textContent.match(/XML Parsing Error:.*/i)
            ) {
              GM_log(d.documentElement.firstChild.textContent);
              callback(null);
                return;
            }
            var h = d.getElementsByTagName("head")[0];
            var hf = document.createDocumentFragment();
            hf.appendChild(h);

            var b = d.getElementsByTagName("body")[0];
            var bf = document.createDocumentFragment();
            bf.appendChild(b);

            var doctype = document.implementation.createDocumentType(d.doctype.name, d.doctype.publicId, d.doctype.systemId);
            var doc = document.implementation.createDocument(d.documentElement.namespaceURI, "html", doctype);

            for (var i = d.documentElement.attributes.length - 1; i >= 0; i--)
              doc.documentElement.setAttribute(d.documentElement.attributes.item(i).nodeName, d.documentElement.attributes.item(i).nodeValue);

            doc.documentElement.appendChild(hf);
            doc.documentElement.appendChild(bf);

            callback(doc);
          }
        });
      }
    }

    getDocument("http://userscripts.org/scripts/issues/" + scriptid, function(doc) {
      if (doc) {
        var votes = {
          "broken":  "broken_votes",
          "copy":    "copy_votes",
          "harmful": "harmful_votes",
          "spam":    "spam_votes",
          "vague":   "vague_votes"
        };

        var thisNode, xpr, matches,
          yesCount = 0,
          noCount = 0;

        for each (var vote in votes) {
          xpr = doc.evaluate(
            "//" + ((doc == document) ? "" : "xhtml:") + "a[contains(@href,'/scripts/issues/" + scriptid + "#" + vote + "')]",
            doc.documentElement,
            nsResolver,
            XPathResult.ANY_UNORDERED_NODE_TYPE,
            null
          );

          if (xpr && xpr.singleNodeValue) {
            thisNode = xpr.singleNodeValue;

            matches = thisNode.textContent.match(/(\d+) of (\d+) voted yes/i);
            if (matches) {
              yesCount += parseInt(matches[1]);
              noCount += parseInt(matches[2]) - parseInt(matches[1]);
            }
          }
        }
      }


      var issuesNode;
      if (doc == document) {
        issuesNode = document.evaluate(
          "//li/text()['Issues']",
          document.documentElement,
          null,
          XPathResult.ANY_UNORDERED_NODE_TYPE,
          null
        );

        if (issuesNode && issuesNode.singleNodeValue) {
          thisNode = issuesNode.singleNodeValue;
          thisNode.textContent += " ";

          thisNode = thisNode.parentNode;
        }
      }
      else {
        issuesNode = document.evaluate(
          "//li/a[contains(@href,'/scripts/issues/" + scriptid + "')]",
          document.documentElement,
          null,
          XPathResult.ANY_UNORDERED_NODE_TYPE,
          null
        );

        if (issuesNode && issuesNode.singleNodeValue) {
          thisNode = issuesNode.singleNodeValue;
          thisNode.textContent += " ";
        }
      }

      var spanNode = document.createElement("span");
      if (!doc || yesCount > noCount)
        spanNode.setAttribute("style", "color: red;");
      if (doc)
        spanNode.textContent = yesCount;
      else
        spanNode.textContent = "0";

      thisNode.appendChild(spanNode);
    });

  }
})();
