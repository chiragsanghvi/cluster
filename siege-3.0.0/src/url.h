#ifndef __URL_H
#define __URL_H
#include <stdlib.h>
#include <joedog/defs.h>
#include <joedog/boolean.h>

/** 
 * a URL object 
 */
typedef struct URL_T *URL;

/**
 * For memory allocation; URLSIZE 
 * provides the object size 
 */
extern size_t  URLSIZE;   

/**
 * HTTP method 
 */
typedef enum {
  HEAD    = 0,
  GET     = 1,
  POST    = 2,
  PUT     = 3,
  DELETE  = 4,
  TRACE   = 5,
  OPTIONS = 6,
  CONNECT = 7
} METHOD;
  
/**
 * enum SCHEME
 */
typedef enum {
  UNSUPPORTED = 0,
  HTTP        = 1,
  HTTPS       = 2,
  FTP         = 3,
  PROXY       = 4
} SCHEME;


/* Constructor / destructor */
URL      new_url(char *str);
URL      url_destroy(URL this);
void     url_dump(URL this);

void     url_set_ID(URL this, int id);
void     url_set_hostname(URL this, char *hostname);
void     url_set_last_modified(URL this, char *date);
void     url_set_etag(URL this, char *etag);
void     url_set_conttype(URL this, char *type);
void     url_set_postdata(URL this, char *postdata, size_t postlen);
void     url_set_method(URL this, METHOD method);

int      url_get_ID(URL this);
METHOD   url_get_method(URL this);
char *   url_get_method_name(URL this) ;

/* <scheme>://<username>:<password>@<hostname>:<port>/<path>;<params>?<query>#<frag> */
char *   url_get_absolute(URL this);

/* <SCHEME>://<username>:<password>@<hostname>:<port>/<path>;<params>?<query>#<frag> */
SCHEME   url_get_scheme(URL this);
char *   url_get_scheme_name(URL this);

/* <scheme>://<USERNAME>:<password>@<hostname>:<port>/<path>;<params>?<query>#<frag> */
char *   url_get_username(URL this);

/* <scheme>://<username>:<PASSWORD>@<hostname>:<port>/<path>;<params>?<query>#<frag> */
char *   url_get_password(URL this);

/* <scheme>://<username>:<password>@<HOSTNAME>:<port>/<path>;<params>?<query>#<frag> */
char *   url_get_hostname(URL this);

/* <scheme>://<username>:<password>@<hostname>:<PORT>/<path>;<params>?<query>#<frag> */
int      url_get_port(URL this);

/* <scheme>://<username>:<password>@<hostname>:<port>/<PATH>;<params>?<query>#<frag> */
char *   url_get_path(URL this);

/* <scheme>://<username>:<password>@<hostname>:<port>/<FILE>;<params>?<query>#<frag> */
char *   url_get_file(URL this);
char *   url_get_request(URL this); // "<PATH><FILE>"

/* <scheme>://<username>:<password>@<hostname>:<port>/<file>;<PARAMS>?<query>#<frag> */
char *   url_get_parameters(URL this);

/* <scheme>://<username>:<password>@<hostname>:<port>/<path>;<params>?<QUERY>#<frag> */
char *   url_get_query(URL this);

/* <scheme>://<username>:<password>@<hostname>:<port>/<path>;<params>?<query>#<FRAG> */
char *   url_get_fragment(URL this);


/**
 * POST method getters
 * <scheme>://<username>:<password>@<hostname>:<port>/<path> POST <params>?<query>#<frag> 
 */
size_t   url_get_postlen(URL this);   
char *   url_get_postdata(URL this);  
char *   url_get_posttemp(URL this); 
char *   url_get_conttype(URL this);  
char *   url_get_if_modified_since(URL this);
char *   url_get_etag(URL this);
char *   url_get_realm(URL this);
void     url_set_realm(URL this, char *realm);
void     url_set_username(URL this, char *username);
void     url_set_password(URL this, char *password);

#endif/*__URL_H*/
