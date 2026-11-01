#!/usr/bin/env perl
use strict;
use warnings;
use Mojo::File qw(curfile);
use Mojolicious::Lite -signatures;
my $port = $ENV{PORT} // 8080;
die "PORT must be an integer from 1 to 65535\n"
  unless $port =~ /\A[0-9]+\z/ && $port >= 1 && $port <= 65535;
app->config(hypnotoad => {
  listen   => ["http://*:$port"],
  pid_file => app->home->rel_file('hypnotoad.pid')->to_string,
});
app->static->paths([curfile->dirname->child('public')->to_string]);
get '/' => sub ($c) { $c->reply->static('index.html') };
get '/health' => sub ($c) { $c->render(json => {status => 'ok'}) };
app->start;
