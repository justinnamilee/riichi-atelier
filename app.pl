#!/usr/bin/env perl

use strict;

use Mojo::File qw[curfile];
use Mojolicious::Lite -signatures;

my $port = $ENV{PORT} // 8080;

die qq[PORT must be an integer from 1 to 65535\n]
  unless $port =~ /^[0-9]+$/ && $port >= 1 && $port <= 65535;

app->config(hypnotoad => {
  listen   => [qq[http://*:$port]],
  pid_file => app->home->rel_file(q[hypnotoad.pid])->to_string,
});

app->static->paths([curfile->dirname->child(q[public])->to_string]);

get q[/] => sub ($c) { $c->reply->static(q[index.html]) };
get q[/health] => sub ($c) { $c->render(json => {status => q[ok]}) };

app->start;
