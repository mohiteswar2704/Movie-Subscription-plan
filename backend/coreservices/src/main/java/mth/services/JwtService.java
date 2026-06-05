package mth.services;

import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;

@Service
public class JwtService {

	@Value("${jwt.secret:#{null}}")
	private String secretBase64;

	private SecretKey key;

	@PostConstruct
	public void init() {
		if (secretBase64 != null && !secretBase64.isBlank()) {
			byte[] decoded = Base64.getDecoder().decode(secretBase64);
			key = Keys.hmacShaKeyFor(decoded);
		} else {
			key = Keys.secretKeyFor(io.jsonwebtoken.SignatureAlgorithm.HS256);
		}
	}

	public Object generateJWT(Object username, Object role) throws Exception {
		Map<String, Object> payload = new HashMap<>();
		payload.put("username", username);
		payload.put("role", role);

		return Jwts.builder()
				.claims(payload)
				.issuedAt(new Date())
				.expiration(new Date(new Date().getTime() + 86400000))
				.signWith(key)
				.compact();
	}

	public Map<String, Object> validateJWT(String token) throws Exception {
		Claims claims = Jwts.parser()
							.verifyWith(key)
							.build()
							.parseSignedClaims(token)
							.getPayload();

		Date expiration = claims.getExpiration();

		Map<String, Object> payload = new HashMap<>();
		if (expiration == null || expiration.before(new Date()))
			throw new Exception("Invalid Token!");

		payload.put("username", claims.get("username"));
		payload.put("role", claims.get("role"));

		return payload;
	}

}
