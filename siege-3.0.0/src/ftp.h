#ifndef __FTP_H
#define __FTP_H

#include <sock.h>
#include <url.h>

BOOLEAN ftp_login(CONN *C, URL U);
BOOLEAN ftp_ascii(CONN *C);
BOOLEAN ftp_binary(CONN *C);
BOOLEAN ftp_size(CONN *C, URL U);
BOOLEAN ftp_cwd(CONN *C, URL U);
BOOLEAN ftp_pasv(CONN *C);
BOOLEAN ftp_list(CONN *C, CONN *D, URL U);
BOOLEAN ftp_stor(CONN *C, URL U);
BOOLEAN ftp_retr(CONN *C, URL U);
size_t  ftp_get(CONN *D, URL U, size_t size);
size_t  ftp_put(CONN *D, URL U);
BOOLEAN ftp_quit(CONN *C);

#endif/*__FTP_H*/
