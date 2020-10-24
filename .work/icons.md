# Icons

Icons are quite challenging. But I want it, seriously.

Windows
-------

http://www.mamachine.org/mslink/index.en.html

This bash script handles it. You can create a shortcut.

But we want to create this shortcut file on the client.


Debian/Ubuntu
-------------

I think this is the easiest. Just some text metadata with the app. Need to look more...


MacOS
-----

name=$1
binary=$2
sudo apt install hfsprogs
dd if=/dev/zero of=./$name.dmg bs=1M count=16 status=progress
mkfs.hfsplus -v Install ./$name.dmg
mkdir -pv /mnt/tmp
sudo mount -o loop ./$name.dmg /mnt/tmp
sudo cp -av $binary /mnt/tmp
sudo umount /mnt/tmp


Then I think it will be possible, create the DMG structure via

https://medium.com/@mattholt/packaging-a-go-application-for-macos-f7084b00f6b5

And somehow creating the DS_Store

I think these people have figured a way:

https://github.com/LinusU/node-appdmg/issues/14


