#ifndef __CREDS_H
#define __CREDS_H

#include <url.h>

typedef struct CREDS_T *CREDS;
extern  size_t CREDSIZE;

CREDS  new_creds(SCHEME scheme, char *str);
CREDS  creds_destroy(CREDS this);
SCHEME creds_get_scheme(CREDS this);
char  *creds_get_username(CREDS this);
char  *creds_get_password(CREDS this);
char  *creds_get_realm(CREDS this);
void   creds_set_username(CREDS this, char *username);
void   creds_set_password(CREDS this, char *password);
void   creds_set_realm(CREDS this, char *realm);

#endif/*__CREDS*/

