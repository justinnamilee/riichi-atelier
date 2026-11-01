use strict;
use warnings;
use FindBin;
use IPC::Open3;
use Symbol qw(gensym);
use Test::More;

sub listener_for {
  my ($port) = @_;
  local $ENV{PORT};
  defined $port ? ($ENV{PORT} = $port) : delete $ENV{PORT};
  my $err = gensym;
  my $pid = open3(undef, my $out, $err, $^X, '-e',
    'require shift @ARGV; print main->can("app")->()->config("hypnotoad")->{listen}[0]',
    "$FindBin::Bin/../app.pl");
  local $/;
  my $stdout = <$out> // '';
  my $stderr = <$err> // '';
  waitpid $pid, 0;
  return ($? >> 8, $stdout, $stderr);
}

for my $case ([undef, 8080], ['9999', 9999], ['65535', 65535]) {
  my ($code, $out) = listener_for($case->[0]);
  is $code, 0, 'valid port configuration loads';
  is $out, "http://*:$case->[1]", 'Hypnotoad uses configured port';
}
for my $invalid ('0', '65536', 'abc', '8080:80', '') {
  my ($code, undef, $err) = listener_for($invalid);
  isnt $code, 0, 'invalid PORT rejected';
  like $err, qr/PORT must be an integer from 1 to 65535/, 'useful validation error';
}
done_testing;
