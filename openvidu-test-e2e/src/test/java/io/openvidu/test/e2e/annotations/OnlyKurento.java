package io.openvidu.test.e2e.annotations;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.test.context.junit.jupiter.DisabledIf;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@DisabledIf(expression = "#{systemProperties['MEDIA_SERVER_IMAGE'] != null && systemProperties['MEDIA_SERVER_IMAGE'].toLowerCase().contains('openvidu/mediasoup-controller')}")
public @interface OnlyKurento {

}
