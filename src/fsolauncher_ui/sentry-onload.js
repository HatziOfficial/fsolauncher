/* global Sentry */
( () => {
  Sentry.onLoad( function() {
    Sentry.init( {
      beforeSend( event ) {
        return sanitizeEvent( event );
      },
    } );
  } );
} )();

function sanitizeEvent( event ) {
  event = sanitizeExceptions( event );
  event = sanitizeBreadcrumbs( event );

  return event;
}

function sanitizeExceptions( event ) {
  if ( event.exceptions && event.exceptions.values ) {
    event.exceptions.values.forEach( ( exception ) => {
      if ( exception.stacktrace && exception.stacktrace.frames ) {
        exception.stacktrace.frames.forEach( ( frame ) => {
          frame.filename = obfuscatePath( frame.filename ); // Obfuscate local file paths
        } );
      }
    } );
  }
  return event;
}

function sanitizeBreadcrumbs( event ) {
  if ( event.breadcrumbs ) {
    event.breadcrumbs.forEach( ( breadcrumb ) => {
      if ( breadcrumb.data ) {
        breadcrumb.data = obfuscatePossibleKeys( breadcrumb.data ); // Obfuscate possible keys with data
      }
    } );
  }
  return event;
}

function obfuscatePath( filePath ) {
  if ( typeof filePath !== 'string' ) {
    return filePath;
  }
  // Replace user directory with a placeholder
  const userDirectory = process.env.HOME || process.env.USERPROFILE;
  return filePath.replace( userDirectory, '[USER_DIR]' );
}

function obfuscatePossibleKeys( data ) {
  // Define keys that may exist in the data object and should be removed
  const sensitiveKeys = [ 'password', 'apiKey', 'accessToken', 'secret' ];

  const obfuscatedData = {};

  for ( const key in data ) {
    if ( sensitiveKeys.includes( key ) ) {
      obfuscatedData[key] = '[REDACTED]';
    } else {
      obfuscatedData[key] = data[key];
    }
  }

  return obfuscatedData;
}