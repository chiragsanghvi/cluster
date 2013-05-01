#ifndef __AUTH_H
#define __AUTH_H

#include <creds.h>
#include <url.h>
#include <joedog/boolean.h>

typedef struct AUTH_T *AUTH;
extern  size_t AUTHSIZE;

typedef struct DIGEST_CRED DCRED;
typedef struct DIGEST_CHLG DCHLG;
typedef enum { BASIC, DIGEST } TYPE;

AUTH    new_auth();
AUTH    auth_destroy(AUTH this);
void    auth_add(AUTH this, CREDS creds);
void    auth_display(AUTH this, SCHEME scheme);
char *  auth_get_basic_header(AUTH this, SCHEME scheme);
BOOLEAN auth_set_basic_header(AUTH this, SCHEME scheme, char *realm);
char *  auth_get_digest_header(AUTH this, SCHEME scheme, DCHLG *chlg, DCRED *cred, const char *meth, const char *uri);
BOOLEAN auth_set_digest_header(AUTH this, DCHLG **ch, DCRED **cr, size_t *rand, char *realm, char *str);
BOOLEAN auth_get_proxy_required(AUTH this);
void    auth_set_proxy_required(AUTH this, BOOLEAN required);
char *  auth_get_proxy_host(AUTH this);
void    auth_set_proxy_host(AUTH this, char *host);
int     auth_get_proxy_port(AUTH this);
void    auth_set_proxy_port(AUTH this, int port);
char *  auth_get_ftp_username(AUTH this, char *realm);
char *  auth_get_ftp_password(AUTH this, char *realm);


#endif/*__AUTH_H*/
