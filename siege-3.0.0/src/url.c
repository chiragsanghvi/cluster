#include <stdio.h>
#include <stdlib.h>
#include <setup.h>
#include <url.h>
#include <load.h>
#include <date.h>
#include <util.h>
#include <joedog/joedog.h>
#include <joedog/boolean.h>

struct URL_T
{
  int       ID;
  char *    url;
  SCHEME    scheme;
  METHOD    method;
  char *    username;
  char *    password;
  char *    hostname;
  int       port;
  char *    path;
  char *    file;
  char *    params;
  BOOLEAN   hasparams;
  char *    query;
  char *    frag;
  char *    request;
  size_t    postlen;
  char *    postdata;
  char *    posttemp;
  char *    conttype;
  time_t    expires;
  time_t    modified;
  BOOLEAN   cached;
  char *    etag;
  char *    realm;
};

size_t URLSIZE = sizeof(struct URL_T);

private void    __url_parse(URL this, char *url);
private void    __parse_post_data(URL this, char *datap);
private char *  __url_set_absolute(URL this, char *url);
private BOOLEAN __url_has_scheme (char *url);
private BOOLEAN __url_has_credentials(char *url);
private int     __url_default_port(URL this);
private char *  __url_set_scheme(URL this, char *url);
private char *  __url_set_password(URL this, char *str);
private char *  __url_set_username(URL this, char *str);
private char *  __url_set_hostname(URL this, char *str);
private char *  __url_set_port(URL this, char *str);
private char *  __url_set_path(URL this, char *str);
private char *  __url_set_file(URL this, char *str);
private char *  __url_set_parameters(URL this, char *str);
private char *  __url_set_query(URL this, char *str);
private char *  __url_set_fragment(URL this, char *str);

URL
new_url(char *str)
{
  URL this;

  this = xcalloc(sizeof(struct URL_T), 1);
  this->ID = 0;
  this->hasparams = FALSE;
  __url_parse(this, str); 
  return this;
}

URL
url_destroy(URL this)
{
  xfree(this->username);
  xfree(this->password);
  xfree(this->hostname);
  xfree(this->path);
  xfree(this->file);
  xfree(this->query);
  xfree(this->frag);
  xfree(this->request);
  xfree(this->conttype);
  xfree(this->postdata);
  xfree(this->etag);
  xfree(this);
  return NULL;  
}

/**
 * URL setters 
 */

void 
url_set_ID(URL this, int ID)
{
  this->ID = ID;
  return;
}

/**
 * if we don't have a hostname at 
 * construction, we can use this 
 * method to add one...
 */
void 
url_set_hostname(URL this, char *hostname) 
{
  size_t len;

  if (empty(hostname)) return;

  xfree(this->hostname);
  len = strlen(hostname)+1;
  this->hostname = xmalloc(len);
  memset(this->hostname, 0, sizeof this->hostname);
  strncpy(this->hostname, hostname, len);
  return;
}

void
url_set_last_modified(URL this, char *date) 
{
  this->modified = strtotime(date);
  return;
}

void
url_set_etag(URL this, char *etag)
{
  size_t len;

  if (empty(etag)) return;

  len = strlen(etag)+1;
  this->etag = xmalloc(len);
  memset(this->etag, 0, sizeof this->etag);
  strncpy(this->etag, etag, len);
  return;
}

void 
url_set_conttype(URL this, char *type) {
  this->conttype = xstrdup(type);
  return;
}

void
url_set_method(URL this, METHOD method) {
  this->method = method;
}

void
url_set_postdata(URL this, char *postdata, size_t postlen)
{
  this->postlen = postlen;

  if (strlen(postdata) > 0) {
    this->postdata = malloc(this->postlen);
    memcpy(this->postdata, postdata, this->postlen);
    this->postdata[this->postlen] = 0;
  }
  return;
}


/**
 * URL getters
 */

public int
url_get_ID(URL this) 
{
  return this->ID;
}

public char *
url_get_absolute(URL this)
{
  return this->url;
}

public SCHEME
url_get_scheme(URL this)
{
  return this->scheme;
}

public char *
url_get_scheme_name(URL this)
{
  switch (this->scheme) {
    case HTTP:
    return "HTTP";
    case HTTPS:
    return "HTTPS";
    case FTP:
    return "FTP";
    case PROXY:
    return "PROXY";
    case UNSUPPORTED:
    default:
    return "UNSUPPORTED";
  }
  return "UNSUPPORTED";
}

public char *
url_get_username(URL this) 
{
  return this->username;
}

public char *
url_get_password(URL this) 
{
  return this->password;
}

public char *
url_get_hostname(URL this)
{
  return this->hostname;
}

public int
url_get_port(URL this)
{
  return this->port;
}

public char *
url_get_path(URL this)
{
  return this->path;
}

public char *
url_get_file(URL this) 
{
  return this->file;
}

public char *
url_get_request(URL this)
{
  return this->request;
}

public char *
url_get_parameters(URL this)
{
  return this->params;
}

public char *
url_get_query(URL this) 
{
  return this->query;
}

public char *
url_get_fragment(URL this)
{
  return this->frag;
}

public size_t
url_get_postlen(URL this) {
  return this->postlen;
}

public char *
url_get_postdata(URL this) {
  return this->postdata;
}

public char *
url_get_posttemp(URL this) {
  return this->posttemp;
}

public char *
url_get_conttype(URL this) {
  return this->conttype;
}

public METHOD 
url_get_method(URL this) {
  return this->method;
}

public char *
url_get_method_name(URL this) {
  switch (this->method){
    case POST:
      return "POST";
    case PUT:
      return "PUT";
    case DELETE:
      return "DELETE";
    case HEAD:
     return "HEAD";
    case GET:
    default:
      return "GET";
  }
  return "GET";
}

char *
url_get_if_modified_since(URL this)
{
  if (this->cached == FALSE){
    return NULL;
  }

  return timetostr(&this->modified);
}

char *
url_get_etag(URL this)
{
  char   *tag;
  size_t len;

  if (empty(this->etag)) return NULL;

  len = strlen(this->etag) + 18;
  tag = xmalloc(len);
  memset(tag, 0, sizeof tag);

  snprintf(tag, len, "If-None-Match: %s\015\012", this->etag);
  return tag;
}

public char *
url_get_realm(URL this)
{
  return (this->realm!=NULL)?this->realm:"";
}

public void
url_set_realm(URL this, char *realm)
{
  this->realm = xstrdup(realm);
}

void
url_set_username(URL this, char *username) 
{
  size_t len = strlen(username);

  this->username = malloc(len+1);
  memset(this->username, '\0', len+1);
  memcpy(this->username, username, len);
  return;
}

void
url_set_password(URL this, char *password) 
{
  size_t len = strlen(password);

  this->password = malloc(len+1);
  memset(this->password, '\0', len+1);
  memcpy(this->password, password, len);
  return;
}

void
url_dump(URL this) 
{
  printf("URL ID:    %d\n", this->ID);
  printf("Abolute:   %s\n", this->url);
  printf("Scheme:    %s\n", url_get_scheme_name(this));
  printf("Method:    %s\n", url_get_method_name(this));
  printf("Username:  %s\n", url_get_username(this));
  printf("Password:  %s\n", url_get_password(this));
  printf("Hostname:  %s\n", url_get_hostname(this));
  printf("Port:      %d\n", url_get_port(this));
  printf("Path:      %s\n", url_get_path(this));
  printf("File:      %s\n", url_get_file(this));
  printf("Request:   %s\n", url_get_request(this));
  if (this->hasparams==TRUE)
    printf("Params:   %s\n", url_get_parameters(this));
  printf("Query:     %s\n", url_get_query(this));
  printf("Fragment:  %s\n", url_get_fragment(this));
  printf("Post Len:  %d\n", url_get_postlen(this));
  printf("Post Data: %s\n", url_get_postdata(this));
  printf("Cont Type: %s\n", url_get_conttype(this));
  //time_t    expires;
  //time_t    modified;
  //BOOLEAN   cached;
  //char *    etag;
  //char *    realm;
  return;
}

private void
__url_parse(URL this, char *url)
{
  char   *ptr;
  char   *post;  
  size_t len;
  
  ptr = __url_set_absolute(this, url);
  ptr = __url_set_scheme(this, ptr);
  
  post = strstr(this->url, " POST");
  if (! post) {
    post = strstr(this->url, " PUT");
  }

  if (post != NULL){
    if (!strncasecmp(post," PUT", 4)) {
      this->method = PUT;
      post += 4;
    } else {
      this->method = POST;
      post += 5;
    }
    __parse_post_data(this, post);
  } else {
    this->method = GET;
    this->postdata   = NULL;
    this->posttemp   = NULL;
    this->postlen    = 0;
  }
  
  if (__url_has_credentials(ptr)) {
    ptr = __url_set_username(this, ptr);
    ptr = __url_set_password(this, ptr);
  }

  ptr = __url_set_hostname(this, ptr);
  ptr = __url_set_port(this, ptr);
  ptr = __url_set_path(this, ptr);
  ptr = __url_set_file(this, ptr); 
  ptr = __url_set_parameters(this, ptr);
  ptr = __url_set_query(this, ptr);
  ptr = __url_set_fragment(this, ptr);

  /**
   * we'll combine the path and the file into 
   * a convenience variable known as 'request'
   */
  len = strlen(this->path)+strlen(this->file)+1;
  this->request = xmalloc(len);
  memset(this->request, '\0', len);
  snprintf(this->request, len, "%s%s", this->path, this->file);

  return;
}

private void
__parse_post_data(URL this, char *datap)
{
  for (; isspace((unsigned int)*datap); datap++) {
    /* Advance past white space */
  }
  if (*datap == '<') {
    datap++;
    load_file(this, datap);
    this->file = xmalloc(strlen(datap)+1);
    memset(this->file, '\0', strlen(datap)+1);
    memcpy(this->file, datap, strlen(datap));
    return;
  } else {
    this->postdata = xstrdup(datap);
    this->postlen  = strlen(this->postdata);
    this->conttype = xstrdup("application/x-www-form-urlencoded");
    return;
  }

  return;
}

/**
 * assign the full url to this->url
 */
private char *
__url_set_absolute(URL this, char *url)
{
  size_t len;
  char   *slash;
  //char *ptr = url;

  if (empty(url)) return NULL;

  len = strlen(url)+5;
  if (!__url_has_scheme(url)) {
    this->url = xmalloc(len+7);
    memset(this->url, '\0', sizeof this->url);
    slash = strstr(url, "/");
    if (slash) {
      snprintf(this->url, len+7, "http://%s", url);
    } else {
      snprintf(this->url, len+7, "http://%s/", url);
    }
  } else {
    this->url = xmalloc(len);
    memset(this->url, '\0', sizeof this->url);
    snprintf(this->url, len, "%s", url);
  }
  return this->url;
}

#define SCHEME_CHAR(ch) (isalnum (ch) || (ch) == '-' || (ch) == '+')
/**
 * stolen from wget:url.c
 */
private BOOLEAN
__url_has_scheme (char *url)
{
  const char *p = url;

  /* The first char must be a scheme char. */
  if (!*p || !SCHEME_CHAR (*p))
    return FALSE;
  ++p;
  /* Followed by 0 or more scheme chars. */
  while (*p && SCHEME_CHAR (*p))
    ++p;
  /* Terminated by ':'. */
  return *p == ':';
}

private BOOLEAN
__url_has_credentials(char *url)
{
  /** 
   * if there's an @ before /?#; then we have creds 
   */
  const char *p = (const char *)strpbrk (url, "@/?#;");
  if (!p || *p != '@')
    return FALSE;
  return TRUE;
}

private int
__url_default_port(URL this)
{
  switch(this->scheme){
    case FTP:
     return 21;
    case HTTP:
      return 80;
    case HTTPS:
      return 443;
    case UNSUPPORTED:
    default:
      return 80;
  }
}

/**
 * set the scheme, i.e., http/https
 * <SCHEME>://<username>:<password>@<hostname>:<port>/<path>;<params>?<query>#<frag>
 */
private char *
__url_set_scheme(URL this, char *url)
{
  if(!strncasecmp(this->url, "http:", 5)){
    this->scheme = HTTP;
    return url+7;
  }
  if(!strncasecmp(this->url, "https:", 6)){
    this->scheme = HTTPS;
    return url+8;
  }
  if(!strncasecmp(this->url, "ftp:", 4)){
    this->scheme = FTP;
    return url+6;
  }
  this->scheme = UNSUPPORTED;
  return url;
}

/**
 * set the username
 * <scheme>://<USERNAME>:<password>@<hostname>:<port>/<path>;<params>?<query>#<frag>
 */
private char *
__url_set_username(URL this, char *str)
{
  int i;
  char *a;
  char *s;

  a = strchr(str, '@');
  s = strchr(str, '/');

  if((!a) || (s && (a >= s))){
    return str;
  }

  for(i = 0; str[i] && str[i] != ':' && str[i] != '@' && str[i] != '/'; i++);

  if(str[i] != '@' && str[i] != ':'){
    return str;
  }

  this->username = malloc(i+1);
  memcpy(this->username, str, i + 1);
  this->username[i] = '\0';
  str += i + 1;

  return str;
}

/**
 * set the password
 * <scheme>://<username>:<PASSWORD>@<hostname>:<port>/<path>;<params>?<query>#<frag>
 */
private char *
__url_set_password(URL this, char *str)
{
  int i;
  char *a;
  char *s;
  a = strchr(str, '@');
  s = strchr(str, '/');

  if((!a) || (s && (a >= s)) ){
    return str;
  }
  /**
   * XXX: as the original author (Zachary Beane <xach@xach.com>) notes:
   * this code breaks if user has an '@' or a '/' in their password. 
   */
  for(i = 0 ; str[i] != '@'; i++);
  this->password = xmalloc(i+1);

  memcpy(this->password, str, i);
  this->password[i] = '\0';

  str += i + 1;

  return str;
}

/**
 * set the hostname
 * <scheme>://<username>:<password>@<HOSTNAME>:<port>/<path>;<params>?<query>#<frag>
 */
private char *
__url_set_hostname(URL this, char *str)
{
  int i;

  /* skip to end, slash, or port colon */
  for(i = 0; str[i] && str[i] != '/' && str[i] != ':'; i++);

  this->hostname = xmalloc(i + 1);
  memcpy(this->hostname, str, i);

  this->hostname[i] = '\0';

  /* if there's a port */
  if(str[i] == ':'){
    str += i + 1;
  } else {
    str += i;
  }
  return str;
}

/**
 * set the port
 * <scheme>://<username>:<password>@<hostname>:<PORT>/<path>;<params>?<query>#<frag>
 */
private char *
__url_set_port(URL this, char *str)
{
  char *portstr;
  int i;

  this->port = __url_default_port(this);

   for(i = 0; isdigit(str[i]); i++);

   if(i == 0) return str;


   portstr = malloc(i + 1);
   memcpy(portstr, str, i + 1);
   portstr[i] = '\0';

   this->port = atoi(portstr);
   xfree(portstr);

   str += i;
   return str;
}

/**
 * set the path
 * <scheme>://<username>:<password>@<hostname>:<port>/<PATH>;<params>?<query>#<frag>
 */
private char *
__url_set_path(URL this, char *str)
{
  int  i;    // capture the lenght of the path
  int  j;    // capture the length of the request (sans frag)

  for(i = strlen(str); i > 0 && str[i] != '/'; i--);
  for(j = 0; str[j] && (str[j] != '#' && !isspace(str[j])); j++);


  if(str[i] != '/'){
    this->path    = xmalloc(2);
    this->request = xmalloc(2);
    strncpy(this->path,    "/", 2);
    strncpy(this->request, "/", 2);
    this->path[1]    = '\0';
    this->request[1] = '\0';
  } else {
    this->path    = xmalloc(i+2);
    this->request = xmalloc(j+2);
    memcpy(this->path, str, i+1);
    memcpy(this->request, str, j+1);
    this->path[i] = '/';
    this->path[i + 1]    = '\0';
    if (this->request[j]=='#') {
      this->request[j]   = '\0'; // lop the #
    } else {
      this->request[j+1] = '\0'; // no frag
    }
  }

  str += i + 1;
  return str;
}

/**
 * set the file
 * <scheme>://<username>:<password>@<hostname>:<port>/<FILE>;<params>?<query>#<frag>
 */
private char *
__url_set_file(URL this, char *str)
{
  int   i;

  if (str==NULL) return NULL;
  if (this->file != NULL && strlen(this->file) > 1) return str;

  for(i = 0; str[i] && (str[i] != ';' && str[i] != '?' && !isspace(str[i])); i++);
  this->file = xmalloc(i+1);
  memset(this->file, '\0', i+1);
  memcpy(this->file, str, i);

  /* if there are params or a query string */
  if (str[i] == ';') { 
    this->hasparams = TRUE;
    str += i + 1;
  } else if(str[i] == '?') {
    str += i + 1;
  } else {
    str += i;
  }
  return str;
}

/**
 * set the parameters
 * <scheme>://<username>:<password>@<hostname>:<port>/<path>;<PARAMS>?<query>#<frag>
 */
private char *
__url_set_parameters(URL this, char *str)
{
  int i;

  if (str==NULL) return NULL;
  if (this->params != NULL && strlen(this->params) > 1) return str;

  if (this->hasparams == FALSE) {
    this->params = "";
    return str;
  }
  
  for (i = 0; str[i] && (str[i] != '?' && !isspace(str[i])); i++);

  this->params = xmalloc(i+1);
  memset(this->params, '\0', i+1);
  memcpy(this->params, str, i);

  /* if there is a query string */
  if(str[i] == '?'){
    str += i + 1;
  } else {
    str += i;
  }
  return str;
}

/**
 * set the query
 * <scheme>://<username>:<password>@<hostname>:<port>/<path>;<params>?<QUERY>#<frag>
 */
private char *
__url_set_query(URL this, char *str)
{
  int   i;

  if (str==NULL) {
    this->query = xstrcat("");
    return NULL;
  }

  if (this->query != NULL && strlen(this->query) > 1) return str;
  
  for(i = 0; str[i] && (str[i] != '#' && !isspace(str[i])); i++);

  this->query = xmalloc(i+1);
  memset(this->query, '\0', i+1);
  memcpy(this->query, str, i);

  /* if there are params or a query string */
  if(str[i] == '#'){
    str += i + 1;
  } else {
    str += i;
  }
  return str;
}

/**
 * set the fragment (not used by siege)
 * <scheme>://<username>:<password>@<hostname>:<port>/<path>;<params>?<query>#<FRAG>
 */
private char *
__url_set_fragment(URL this, char *str)
{
  int   i;

  if (str==NULL) return NULL;
  if (this->frag != NULL && strlen(this->frag) > 1) return str;

  for(i = 0; str[i] && !isspace(str[i]); i++);

  this->frag = xmalloc(i+1);
  memcpy(this->frag, str, i);

  str += i + 1;
  return str;
}
