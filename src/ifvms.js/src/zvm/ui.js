/*

Z-Machine UI
============

Copyright (c) 2011 The ifvms.js team
BSD licenced
http://github.com/curiousdannii/ifvms.js

*/

/*

Note: is used by both ZVM and Gnusto. In the case of Gnusto the engine is actually GnustoRunner.

TODO:
	default background/foreground colours
	Does set_window really need to send a find command?
	Either stop setting undefined styles, or change extend() to ignore undefineds?
	
*/

(function( window, undefined ){

// Utility to extend objects
var extend = function( old, add )
{
	for ( var name in add )
	{
		old[name] = add[name];
	}
	return old;
},

// Standard colours
colours = [
	-2,
	0xFFFF,
	0x0000,
	0x001D,
	0x0340,
	0x03BD,
	0x59A0,
	0x7C1F,
	0x77A0,
	0x7FFF,
	0x5AD6,
	0x4631,
	0x2D6B
],

// Convert a 15 bit colour to RGB
convert_true_colour = function( colour )
{
	// Stretch the five bits per colour out to 8 bits
	var newcolour = Math.round( ( colour & 0x1F ) * 8.226 ) << 16
		| Math.round( ( ( colour & 0x03E0 ) >> 5 ) * 8.226 ) << 8
		| Math.round( ( ( colour & 0x7C00 ) >> 10 ) * 8.226 );
	newcolour = newcolour.toString( 16 );
	// Ensure the colour is 6 bytes long
	while ( newcolour.length < 6 )
	{
		newcolour = '0' + newcolour;
	}
	return '#' + newcolour;
};

window.ZVMUI = Object.subClass({
	init: function( engine, headerbit )
	{
		this.e = engine;
		this.buffer = '';
		this.styles = {};
		// Bit 0 is for @set_style, bit 1 for the header, and bit 2 for @set_font
		this.mono = headerbit;
		
		// Upper window stuff
		this.currentwin = 0;
		this.status = []; // Status window orders
		
		// Construct the basic windows
		engine.orders.push(
			{
				code: 'stream',
				name: 'status'
			},
			{
				code: 'stream',
				name: 'main'
			},
			{
				code: 'find',
				name: 'main'
			}
		);
	},
	
	// Actually clear a window, called by the opcode handler below
	clear_window: function( window )
	{
		this.e.orders.push({
			code: 'clear',
			name: window ? 'status' : 'main',
			css: extend( {}, this.styles )
		});
	},
	
	erase_line: function( value )
	{
		if ( value == 1 )
		{
			this.flush();
			this.status.push( { code: "eraseline" } );
		}
	},
	
	erase_window: function( window )
	{
		this.flush();
		if ( window == -1 )
		{
			this.split_window( 0 );
			this.clear_window( 0 );
		}
		if ( window == -2 )
		{
			this.clear_window( 0 );
			this.clear_window( 1 );
		}
		else
		{
			this.clear_window( window );
		}
	},
	
	// Flush the buffer to the orders
	flush: function()
	{
		var order;
		
		// If we have a buffer transfer it to the orders
		if ( this.buffer != '' )
		{
			order = {
				code: 'stream',
				// Copy the styles object so that we won't be affected by later style changes
				css: extend( {}, this.styles ),
				text: this.buffer
			};
			if ( this.mono )
			{
				order.node = 'tt';
			}
			( this.currentwin ? this.status : this.e.orders ).push( order );
			this.buffer = '';
		}
	},
	
	get_cursor: function( array )
	{
		// act() will flush
		this.status.push({
			code: 'get_cursor',
			addr: array
		});
		this.e.act();
	},
	
	// Set basic colours
	set_colour: function( foreground, background )
	{
		this.set_true_colour( colours[foreground], colours[background] );
	},
	
	set_cursor: function( row, col )
	{
		this.flush();
		this.status.push({
			code: 'cursor',
			to: [row, col]
		});
	},
	
	set_font: function( font )
	{
		// We only support fonts 1 and 4
		if ( font != 1 && font != 4 )
		{
			return 0;
		}
		var returnval = this.mono & 0x04 ? 4 : 1;
		if ( font != returnval )
		{
			this.flush();
			this.mono ^= 0x04;
		}
		return returnval;
	},
	
	// Set styles
	set_style: function( stylebyte )
	{
		var styles = this.styles;
		
		this.flush();
		
		// Setting the style to Roman will clear the others
		if ( stylebyte == 0 )
		{
			styles.reverse = styles['font-weight'] = styles['font-style'] = undefined;
			this.mono &= 0xFE;
		}
		if ( stylebyte & 0x01 )
		{
			styles.reverse = 1;
		}
		if ( stylebyte & 0x02 )
		{
			styles['font-weight'] = 'bold';
		}
		if ( stylebyte & 0x04 )
		{
			styles['font-style'] = 'italic';
		}
		if ( stylebyte & 0x08 )
		{
			this.mono |= 0x01;
		}
	},
	
	// Set true colours
	set_true_colour: function( foreground, background )
	{
		var styles = this.styles,
		newforeground = styles.color,
		newbackground = styles['background-color'];
		
		this.flush();
		
		if ( foreground == 0xFFFF )
		{
			newforeground = undefined;
		}
		else if ( foreground < 0x8000 )
		{
			newforeground = convert_true_colour( foreground );
		}
		
		if ( background == 0xFFFF )
		{
			newbackground = undefined;
		}
		else if ( background < 0x8000 )
		{
			newbackground = convert_true_colour( background );
		}
		
		// Set the colours
		styles.color = newforeground;
		styles['background-color'] = newbackground;
	},
	
	set_window: function( window )
	{
		this.flush();
		this.currentwin = window;
		this.e.orders.push({
			code: 'find',
			name: window ? 'status' : 'main'
		});
	},
	
	split_window: function( lines )
	{
		this.flush();
		this.status.push({
			code: "height",
			lines: lines
		});
	}
});

})( this );