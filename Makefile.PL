use strict;
use warnings;
use ExtUtils::MakeMaker;

WriteMakefile(
  NAME             => 'Riichi::Atelier',
  VERSION          => '1.0.0',
  ABSTRACT         => 'A browser-based riichi mahjong scoring app',
  MIN_PERL_VERSION => '5.020',
  PREREQ_PM        => { 'Mojolicious' => '9.41' },
  TEST_REQUIRES    => { 'Test::More' => 0 },
  PM               => {},
  test             => { TESTS => 't/*.t' },
);
