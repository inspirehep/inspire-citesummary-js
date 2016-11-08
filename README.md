# INSPIRE Cite Summary

A JavaScript module providing Cite Summary functionality
for papers, institutions, authors, conferences, etc.

##  Examples

Examples are available in the example directory. Simply follow these instructions to see the examples live.

``` bash

    # from the base directory (where package.json is located)
    npm install
    gulp build
    
    python -m SimpleHTTPServer # this will run a web server on localhost:8000 by default. 
```

Then open your browser at http://localhost:8000 to see the examples for 
a single paper, authors, and an institution.

## Usage

Include these resources in your HTML file.

``` html

<script src="../node_modules/angular/angular.js"></script>
<script src="../node_modules/jquery/dist/jquery.min.js"></script>
<script src="../node_modules/crossfilter2/crossfilter.min.js"></script>
<script src="../node_modules/d3/d3.min.js"></script>
<script src="../dist/inspire-citesummary-js.js"></script>
<link href="../node_modules/bootstrap/dist/css/bootstrap.min.css" rel="stylesheet"/>
<link href="../node_modules/dc/dc.min.css" rel="stylesheet"/>

```

Then, you'll be able to invoke the cite summary directive with options indicating the api-endpoint
you wish to use and the template you want.

``` html
 <cite-summary api-endpoint="http://localhost:8000/examples/data/barbara.json"
                              template="../dist/templates/papers-and-citations.html">
 </cite-summary>

```
