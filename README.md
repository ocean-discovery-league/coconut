# Coconut Daemon

## Installation

Get coconut onto the Raspberry Pi in /usr/local:

```
$ cd /usr/local
$ sudo mkdir coconut
$ sudo chown pi:pi coconut
$ git clone https://github.com/mitmedialab/coconut.git
# you will need to type your github username & password,
# or enable one-time-codes (recommended) and use that as the pw
# New better option! Use your laptop's ssh key with agent forwarding:
# https://docs.github.com/en/developers/overview/using-ssh-agent-forwarding
```

Or if that's too troublesome, download the repo as a zip file and unpack it into `/user/local`, but make sure everything is still owned by the `pi` user in the end (`sudo chown -R pi:pi /usr/local/coconut`).

Install the local copy of `node`:

```
$ ln -s /usr/local/coconut ~  # just a convenience
$ cd /usr/local/coconut
$ ./install-node.sh   # must be on the internet for this step and the next one
$ yarn install
#$ yarn build  # not needed yet, but someday
```
At this point you can test things with:
```
$ sudo ./start.sh
```
And it should just run right there in your terminal. If that looks good, then you can press ctrl-c to stop it and continue to make it run as a proper daemon:

```
$ sudo cp -p coconut.service /etc/systemd/system/
$ sudo systemctl start coconut
$ sudo systemctl status coconut  # see that it started up ok
$ sudo systemctl enable coconut  # set it to start on boot
```

Once it's under `systemctl`, you can look at it's logs with:
```
$ sudo journalctl -u coconut     # the entire log in one shot
$ sudo journalctl -u coconut -f  # follow the log as it happens (like `tail -f`)
$ sudo journalctl -u coconut -f --lines=200  # if you want more than 10 lines of context for -f
```

If you want to do debugging or development you can temporarly stop the background daemon and fire it back up in you termainl for easy restarting and output viewing.

```
$ sudo systemctl stop coconut   # it will still restart at next boot
$ cd /usr/local/coconut
$ sudo ./start.sh
```
