<?php
define('FLAG', 'FLAG{web_03_ssrf_internal_d8v5}');
define('APP_NAME', 'LinkPeek');
define('APP_VERSION', '1.4.2');
define('INTERNAL_API', 'http://127.0.0.1:8080');

// "Security" blacklist - easily bypassable
define('BLOCKED_HOSTS', ['127.0.0.1', 'localhost', '10.0.0.1']);
define('BLOCKED_SCHEMES', ['file', 'gopher', 'dict', 'ftp']);
