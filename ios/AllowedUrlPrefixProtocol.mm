#import "AllowedUrlPrefixProtocol.h"

@implementation AllowedUrlPrefixProtocol

NSArray *allowedUrlPrefixes = nil;

+ (NSArray *)getAllowedUrlPrefixes
{
    if (allowedUrlPrefixes == nil) {
      NSString *allowedUrlPrefixList  = [[NSBundle mainBundle].infoDictionary objectForKey:@"AllowedUrlPrefixes"];
      allowedUrlPrefixes = [allowedUrlPrefixList componentsSeparatedByString:@","];
    }
    return allowedUrlPrefixes;
}
+ (BOOL)canInitWithRequest:(NSURLRequest *)request
{
  NSArray *allowedUrlPrefixes = [self getAllowedUrlPrefixes];
    BOOL hasPrefixInArray = NO;
    for (int i = 0; i < [allowedUrlPrefixes count] && hasPrefixInArray == NO; i++)
    {
      hasPrefixInArray = [[request.URL.absoluteString lowercaseString] hasPrefix:[allowedUrlPrefixes[i] lowercaseString]];
    }
    return !hasPrefixInArray;
}

+ (NSURLRequest *)canonicalRequestForRequest:(NSURLRequest *)request { return request; }
- (NSCachedURLResponse *)cachedResponse { return nil; }

- (void)startLoading
{
    // For every request, emit "didFailWithError:" with an NSError to reflect the network blocking state
    id<NSURLProtocolClient> client = [self client];
    NSError* error = [NSError errorWithDomain:NSURLErrorDomain
      code:kCFURLErrorNotConnectedToInternet // = -1009 = error code when network is down
      userInfo:@{NSLocalizedDescriptionKey:@"URL not allowed"}];
    [client URLProtocol:self didFailWithError:error];
}
- (void)stopLoading { }

@end
