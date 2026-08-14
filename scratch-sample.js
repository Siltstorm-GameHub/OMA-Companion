const sharp = require('sharp');
const path = 'scratch-schreibtisch_eck.png';

async function sample(x, y, w, h, label) {
  const { data } = await sharp(path).extract({ left: x, top: y, width: w, height: h }).raw().toBuffer({ resolveWithObject: true });
  let r=0,g=0,b=0,n=data.length/3;
  for (let i=0;i<data.length;i+=3){ r+=data[i]; g+=data[i+1]; b+=data[i+2]; }
  r/=n; g/=n; b/=n;
  const dist = Math.sqrt((255-r)**2 + (0-g)**2 + (255-b)**2);
  console.log(label, 'RGB(' + r.toFixed(0) + ',' + g.toFixed(0) + ',' + b.toFixed(0) + ')', 'dist=' + dist.toFixed(1));
}

async function main() {
  const meta = await sharp(path).metadata();
  console.log('size', meta.width, meta.height);
  // top corner background
  await sample(10, 10, 30, 30, 'bg-top-left');
  await sample(meta.width - 40, 10, 30, 30, 'bg-top-right');
  // bottom area near shadow (desk sits mid-lower, shadow likely under legs)
  await sample(meta.width/2 - 15, meta.height - 40, 30, 30, 'bottom-center (shadow?)');
  await sample(20, meta.height - 40, 30, 30, 'bottom-left');
}
main();
