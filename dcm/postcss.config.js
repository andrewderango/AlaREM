module.exports = {
  plugins: [
    require('postcss-import'),
    require('postcss-preset-env')({
      stage: 0,
      features: {
        'nesting-rules': true,
      },
    }),
    require('postcss-mixins'),
    require('postcss-simple-vars'),
    require('postcss-nested'),
    require('postcss-color-mod-function'),
    require('autoprefixer'),
  ],
}
